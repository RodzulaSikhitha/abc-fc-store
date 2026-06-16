// Shared invoice email generation/sending — used by both /api/orders (COD)
// and /api/payment-webhook (paid online via iKhokha).

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function generateInvoiceHTML(order) {
  const orderNum = esc(order.orderNum);
  const paidOnline = order.payment === 'online';
  const itemsRows = order.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;font-family:sans-serif;font-size:13px;color:#f0f0f0;">${esc(item.name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:sans-serif;font-size:13px;color:#999;">${esc(item.size)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:sans-serif;font-size:13px;color:#999;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:right;font-family:sans-serif;font-size:13px;color:#F5A800;font-weight:bold;">R ${(item.price * item.qty).toFixed(2)}</td>
    </tr>`).join('');
  const addr = order.address || {};

  const paymentBlock = paidOnline
    ? `<p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;">Payment Method</p>
       <p style="font-size:14px;color:#f0f0f0;margin:0;">Paid Online (iKhokha)</p>
       <p style="font-size:12px;color:#999;margin:8px 0 0;">We've received your payment of <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong>. This is your tax invoice — thank you!</p>`
    : `<p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;">Payment Method</p>
       <p style="font-size:14px;color:#f0f0f0;margin:0;">Cash on Delivery (Limpopo)</p>
       <p style="font-size:12px;color:#999;margin:8px 0 0;">Please have <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong> ready in cash when your order is delivered. We'll contact you to arrange delivery.</p>`;

  const totalLabel = paidOnline ? 'Total Paid' : 'Total Due on Delivery';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Invoice ${orderNum} - ABC FC Store</title></head>
<body style="background:#0d0d0d;margin:0;padding:20px;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#141414;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
    <tr><td style="background:#0d0d0d;padding:28px 28px 20px;border-bottom:3px solid #F5A800;text-align:center;">
      <p style="font-size:30px;font-weight:900;letter-spacing:0.06em;color:#F5A800;margin:0 0 4px;text-transform:uppercase;">ABC FC</p>
      <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#999;margin:0;text-transform:uppercase;">Official Store · Lion of the North</p>
    </td></tr>
    <tr><td style="padding:24px 28px 0;">
      <table width="100%"><tr>
        <td><p style="font-size:22px;font-weight:900;color:#f0f0f0;margin:0;text-transform:uppercase;">Order Confirmation</p>
          <p style="font-size:13px;color:#999;margin:4px 0 0;">${esc(new Date(order.createdAt || Date.now()).toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' }))}</p></td>
        <td style="text-align:right;"><p style="font-size:13px;font-weight:700;color:#F5A800;margin:0;text-transform:uppercase;">Order Number</p>
          <p style="font-size:18px;font-weight:900;color:#f0f0f0;margin:4px 0 0;">${orderNum}</p></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 28px 0;">
      <table width="100%"><tr>
        <td style="width:50%;vertical-align:top;">
          <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 8px;text-transform:uppercase;">Billed To</p>
          <p style="font-size:14px;color:#f0f0f0;margin:0 0 4px;font-weight:700;">${esc(order.name)}</p>
          <p style="font-size:13px;color:#999;margin:0 0 2px;">${esc(order.email)}</p>
          <p style="font-size:13px;color:#999;margin:0;">${esc(order.phone)}</p></td>
        <td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 8px;text-transform:uppercase;">Deliver To</p>
          <p style="font-size:13px;color:#999;margin:0;line-height:1.7;">
            ${esc(addr.line1)}${addr.line2 ? '<br/>' + esc(addr.line2) : ''}<br/>
            ${esc(addr.city)}, ${esc(addr.postal)}<br/>${esc(addr.province)}, South Africa</p></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 28px 0;">
      <table width="100%" style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#1a1a1a;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#F5A800;text-transform:uppercase;">Product</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#F5A800;text-transform:uppercase;">Size</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#F5A800;text-transform:uppercase;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#F5A800;text-transform:uppercase;">Total</th>
        </tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <table width="100%">
        <tr><td style="padding:6px 0;font-size:13px;color:#999;">Subtotal</td><td style="padding:6px 0;font-size:13px;color:#999;text-align:right;">R ${order.subtotal.toFixed(2)}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#999;">Delivery</td><td style="padding:6px 0;font-size:13px;color:#999;text-align:right;">${order.delivery === 0 ? 'FREE' : 'R ' + order.delivery.toFixed(2)}</td></tr>
        <tr><td colspan="2" style="border-top:1px solid #2a2a2a;padding-top:10px;"></td></tr>
        <tr><td style="padding:6px 0;font-size:16px;font-weight:900;color:#f0f0f0;text-transform:uppercase;">${totalLabel}</td><td style="padding:6px 0;font-size:20px;font-weight:900;color:#F5A800;text-align:right;">R ${order.total.toFixed(2)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;">
        ${paymentBlock}
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;text-align:center;border-top:1px solid #2a2a2a;">
      <p style="font-size:12px;color:#555;margin:0 0 6px;">Thank you for supporting ABC FC — Lion of the North!</p>
      <p style="font-size:11px;color:#444;margin:0;">Questions? tshibalo.lucas@gmail.com · +27 71 109 2360</p>
    </td></tr>
  </table>
</body></html>`;
}

function sendInvoice(order) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return Promise.resolve(false);
  const https = require('https');
  const subject = order.payment === 'online'
    ? `Payment Received — Your ABC FC Order ${order.orderNum}`
    : `Your ABC FC Order — ${order.orderNum}`;
  const payload = JSON.stringify({
    from: 'ABC FC Store <store@abcfc.store>',
    to: [order.email],
    bcc: ['tshibalo.lucas@gmail.com'],
    subject,
    html: generateInvoiceHTML(order),
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (r) => { r.on('data', () => {}); r.on('end', () => resolve(r.statusCode >= 200 && r.statusCode < 300)); });
    req.on('error', () => resolve(false));
    req.write(payload); req.end();
  });
}

module.exports = { generateInvoiceHTML, sendInvoice };
