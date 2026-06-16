// Vercel Serverless Function — /api/payment-webhook
// Receives iKhokha's payment callback. We do NOT trust the webhook body's
// status field on its own (iKhokha's own signature scheme for inbound
// webhooks isn't reliably verifiable from the published examples) — instead
// we use the paylinkID it gives us to ask iKhokha directly, over our own
// signed server-to-server request, what the real status is. Only that
// confirmed status is ever written to the database or triggers an invoice.

const { getSql, ensureSchema } = require('./_db');
const { reconcileOnlineOrder } = require('./_payment');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// iKhokha's webhook payload shape isn't documented anywhere we could find,
// so accept a few plausible key spellings rather than guessing wrong once
// and silently dropping every real callback.
function pick(body, keys) {
  for (const k of keys) {
    if (typeof body[k] === 'string' && body[k]) return body[k];
  }
  return '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Always acknowledge quickly — iKhokha should not retry forever — but
  // never report success back to the client; this is a server-to-server
  // notification with no audience.
  try {
    const body = req.body || {};
    // Logged (not returned to any client) so we can see the real payload
    // shape the next time a live payment comes through.
    console.log('[payment-webhook] raw body:', JSON.stringify(body));

    const externalTransactionID = str(pick(body, ['externalTransactionID', 'externalTransactionId', 'paymentReference', 'reference']), 20);
    const paylinkID = str(pick(body, ['paylinkID', 'paylinkId', 'payLinkID', 'id']), 100);
    if (!externalTransactionID || !paylinkID) {
      console.error('[payment-webhook] missing identifiers in payload', JSON.stringify(body));
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

    // Make sure this callback is for the paylink we actually created.
    if (row.paylink_id && row.paylink_id !== paylinkID) {
      console.error('[payment-webhook] paylinkID mismatch for', externalTransactionID);
      return res.status(200).json({ ok: true });
    }

    await reconcileOnlineOrder(sql, row);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[payment-webhook] error:', err.message);
    return res.status(200).json({ ok: true });
  }
};
