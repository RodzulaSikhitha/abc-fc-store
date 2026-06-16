// Vercel Serverless Function — /api/payment-webhook
// Receives iKhokha's payment callback. We do NOT trust the webhook body's
// status field on its own (iKhokha's own signature scheme for inbound
// webhooks isn't reliably verifiable from the published examples) — instead
// we use the paylinkID it gives us to ask iKhokha directly, over our own
// signed server-to-server request, what the real status is. Only that
// confirmed status is ever written to the database or triggers an invoice.

const { getSql, ensureSchema } = require('./_db');
const { sendInvoice } = require('./_invoice');
const ikhokha = require('./_ikhokha');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Always acknowledge quickly — iKhokha should not retry forever — but
  // never report success back to the client; this is a server-to-server
  // notification with no audience.
  try {
    const body = req.body || {};
    const externalTransactionID = str(body.externalTransactionID, 20);
    const paylinkID = str(body.paylinkID, 100);
    if (!externalTransactionID || !paylinkID) {
      console.error('[payment-webhook] missing identifiers in payload');
      return res.status(200).json({ ok: true });
    }

    const sql = getSql();
    if (!sql) return res.status(200).json({ ok: true });
    await ensureSchema(sql);

    const rows = await sql`
      SELECT order_num, email, name, phone, address, items, subtotal, delivery, total, payment, status, paylink_id, created_at
      FROM orders WHERE order_num = ${externalTransactionID} LIMIT 1`;
    if (!rows.length) {
      console.error('[payment-webhook] unknown order', externalTransactionID);
      return res.status(200).json({ ok: true });
    }
    const row = rows[0];

    // Idempotent — ignore repeat callbacks for an order already settled.
    if (row.status === 'paid' || row.status === 'failed' || row.status === 'cancelled') {
      return res.status(200).json({ ok: true });
    }
    // Make sure this callback is for the paylink we actually created.
    if (row.paylink_id && row.paylink_id !== paylinkID) {
      console.error('[payment-webhook] paylinkID mismatch for', externalTransactionID);
      return res.status(200).json({ ok: true });
    }

    const confirmed = await ikhokha.getStatus(paylinkID);
    const status = String(confirmed.status || confirmed.responseCode || '').toUpperCase();

    if (status === 'SUCCESS' || status === 'PAID' || status === 'COMPLETED') {
      await sql`UPDATE orders SET status = 'paid' WHERE order_num = ${externalTransactionID}`;
      const order = {
        orderNum: row.order_num,
        email: row.email,
        name: row.name,
        phone: row.phone,
        address: row.address,
        items: Array.isArray(row.items) ? row.items : [],
        subtotal: Number(row.subtotal),
        delivery: Number(row.delivery),
        total: Number(row.total),
        payment: 'online',
        createdAt: row.created_at,
      };
      await sendInvoice(order);
    } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
      await sql`UPDATE orders SET status = ${status.toLowerCase()} WHERE order_num = ${externalTransactionID}`;
    }
    // Any other status (e.g. still pending) — leave as pending_payment, a
    // later callback or retry will resolve it.

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[payment-webhook] error:', err.message);
    return res.status(200).json({ ok: true });
  }
};
