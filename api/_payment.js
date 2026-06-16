// Shared online-payment reconciliation — used by both /api/payment-webhook
// and the GET order-status lookup in /api/orders, so a customer simply
// checking their order acts as a self-healing backstop if the webhook
// callback from iKhokha never arrives or arrives in a shape we don't
// recognise. Never trusts an inbound payload's own status field — always
// re-asks iKhokha directly via a signed server-to-server request.
const { sendInvoice } = require('./_invoice');
const ikhokha = require('./_ikhokha');

const SETTLED = ['paid', 'failed', 'cancelled'];

async function reconcileOnlineOrder(sql, row) {
  if (row.payment !== 'online') return row.status;
  if (SETTLED.includes(row.status)) return row.status;
  if (!row.paylink_id) return row.status;

  let confirmed;
  try {
    confirmed = await ikhokha.getStatus(row.paylink_id);
  } catch (e) {
    console.error('[payment] getStatus failed for', row.order_num, e.message);
    return row.status;
  }
  const status = String(confirmed.status || confirmed.responseCode || '').toUpperCase();

  if (status === 'SUCCESS' || status === 'PAID' || status === 'COMPLETED') {
    await sql`UPDATE orders SET status = 'paid' WHERE order_num = ${row.order_num}`;
    await sendInvoice({
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
      status: 'paid',
      createdAt: row.created_at,
    });
    return 'paid';
  }
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
    const next = status.toLowerCase();
    await sql`UPDATE orders SET status = ${next} WHERE order_num = ${row.order_num}`;
    return next;
  }
  return row.status;
}

module.exports = { reconcileOnlineOrder };
