// Shared order/payment emails — used by /api/orders (order received, COD
// invoice) and /api/payment-webhook (payment confirmed invoice).
// Sent via Resend (RESEND_API_KEY). Branding matches the storefront
// (css/store.css): gold #F5A800 on near-black, Bebas Neue / Barlow
// Condensed / Inter font stack, ABC FC logo.

const SITE_URL = 'https://abcfc.store';
const LOGO_URL = `${SITE_URL}/images/abc-fc-logo.jpeg`;
const SUPPORT_EMAIL = 'sikhitha.r@gmail.com';
const SUPPORT_PHONE = '+27 71 109 2360';

const FONT_DISPLAY = "'Bebas Neue','Arial Narrow',Arial,sans-serif";
const FONT_SUB = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const FONT_BODY = "'Inter','Helvetica Neue',Arial,sans-serif";

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function generateInvoiceHTML(order) {
  const orderNum = esc(order.orderNum);
  const isPending = order.status === 'pending_payment';
  const isPaidOnline = order.status === 'paid' && order.payment === 'online';

  const itemsRows = order.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;font-family:${FONT_BODY};font-size:13px;color:#f0f0f0;">${esc(item.name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:${FONT_BODY};font-size:13px;color:#999;">${esc(item.size)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:${FONT_BODY};font-size:13px;color:#999;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:right;font-family:${FONT_BODY};font-size:13px;color:#F5A800;font-weight:bold;">R ${(item.price * item.qty).toFixed(2)}</td>
    </tr>`).join('');
  const addr = order.address || {};

  let heading, totalLabel, paymentBlock;
  if (isPending) {
    heading = 'Order Received';
    totalLabel = 'Total Due';
    const payUrl = esc(order.paymentUrl || '');
    paymentBlock = `
      <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;font-family:${FONT_SUB};">Payment Status</p>
      <p style="font-size:14px;color:#f0f0f0;margin:0;font-family:${FONT_BODY};">Awaiting payment via iKhokha</p>
      <p style="font-size:12px;color:#999;margin:8px 0 14px;font-family:${FONT_BODY};">We've received your order — it'll be confirmed as soon as your payment of <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong> clears.</p>
      ${payUrl ? `<a href="${payUrl}" style="display:inline-block;background:#F5A800;color:#0d0d0d;font-family:${FONT_SUB};font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-size:13px;padding:10px 20px;border-radius:6px;text-decoration:none;">Complete Payment</a>` : ''}`;
  } else if (isPaidOnline) {
    heading = 'Payment Confirmed';
    totalLabel = 'Total Paid';
    paymentBlock = `
      <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;font-family:${FONT_SUB};">Payment Method</p>
      <p style="font-size:14px;color:#f0f0f0;margin:0;font-family:${FONT_BODY};">Paid Online (iKhokha)</p>
      <p style="font-size:12px;color:#999;margin:8px 0 0;font-family:${FONT_BODY};">We've received your payment of <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong>. This is your tax invoice — thank you!</p>`;
  } else {
    heading = 'Order Confirmation';
    totalLabel = 'Total Due on Delivery';
    paymentBlock = `
      <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;font-family:${FONT_SUB};">Payment Method</p>
      <p style="font-size:14px;color:#f0f0f0;margin:0;font-family:${FONT_BODY};">Cash on Delivery (Limpopo)</p>
      <p style="font-size:12px;color:#999;margin:8px 0 0;font-family:${FONT_BODY};">Please have <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong> ready in cash when your order is delivered. We'll contact you to arrange delivery.</p>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${heading} ${orderNum} - ABC Store</title>
</head>
<body style="background:#0d0d0d;margin:0;padding:20px;font-family:${FONT_BODY};">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#141414;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
    <tr><td style="background:#0d0d0d;padding:24px 28px 20px;border-bottom:3px solid #F5A800;text-align:center;">
      <img src="${LOGO_URL}" width="56" height="56" alt="ABC FC" style="display:block;margin:0 auto 10px;border-radius:8px;" />
      <p style="font-family:${FONT_DISPLAY};font-size:30px;font-weight:900;letter-spacing:0.06em;color:#F5A800;margin:0 0 4px;text-transform:uppercase;">ABC Store</p>
      <p style="font-family:${FONT_SUB};font-size:11px;font-weight:700;letter-spacing:0.1em;color:#999;margin:0;text-transform:uppercase;">ABC FC · Lion of the North</p>
    </td></tr>
    <tr><td style="padding:24px 28px 0;">
      <table width="100%"><tr>
        <td><p style="font-family:${FONT_SUB};font-size:22px;font-weight:800;color:#f0f0f0;margin:0;text-transform:uppercase;">${heading}</p>
          <p style="font-size:13px;color:#999;margin:4px 0 0;">${esc(new Date(order.createdAt || Date.now()).toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' }))}</p></td>
        <td style="text-align:right;"><p style="font-family:${FONT_SUB};font-size:13px;font-weight:700;color:#F5A800;margin:0;text-transform:uppercase;">Order Number</p>
          <p style="font-size:18px;font-weight:900;color:#f0f0f0;margin:4px 0 0;">${orderNum}</p></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 28px 0;">
      <table width="100%"><tr>
        <td style="width:50%;vertical-align:top;">
          <p style="font-family:${FONT_SUB};font-size:11px;font-weight:700;color:#F5A800;margin:0 0 8px;text-transform:uppercase;">Billed To</p>
          <p style="font-size:14px;color:#f0f0f0;margin:0 0 4px;font-weight:700;">${esc(order.name)}</p>
          <p style="font-size:13px;color:#999;margin:0 0 2px;">${esc(order.email)}</p>
          <p style="font-size:13px;color:#999;margin:0;">${esc(order.phone)}</p></td>
        <td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="font-family:${FONT_SUB};font-size:11px;font-weight:700;color:#F5A800;margin:0 0 8px;text-transform:uppercase;">Deliver To</p>
          <p style="font-size:13px;color:#999;margin:0;line-height:1.7;">
            ${esc(addr.line1)}${addr.line2 ? '<br/>' + esc(addr.line2) : ''}<br/>
            ${esc(addr.city)}, ${esc(addr.postal)}<br/>${esc(addr.province)}, South Africa</p></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 28px 0;">
      <table width="100%" style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#1a1a1a;">
          <th style="padding:10px 12px;text-align:left;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Product</th>
          <th style="padding:10px 12px;text-align:center;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Size</th>
          <th style="padding:10px 12px;text-align:center;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Total</th>
        </tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <table width="100%">
        <tr><td style="padding:6px 0;font-size:13px;color:#999;">Subtotal</td><td style="padding:6px 0;font-size:13px;color:#999;text-align:right;">R ${order.subtotal.toFixed(2)}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#999;">Delivery</td><td style="padding:6px 0;font-size:13px;color:#999;text-align:right;">${order.delivery === 0 ? 'FREE' : 'R ' + order.delivery.toFixed(2)}</td></tr>
        <tr><td colspan="2" style="border-top:1px solid #2a2a2a;padding-top:10px;"></td></tr>
        <tr><td style="padding:6px 0;font-family:${FONT_SUB};font-size:16px;font-weight:800;color:#f0f0f0;text-transform:uppercase;">${totalLabel}</td><td style="padding:6px 0;font-size:20px;font-weight:900;color:#F5A800;text-align:right;">R ${order.total.toFixed(2)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;">
        ${paymentBlock}
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;text-align:center;border-top:1px solid #2a2a2a;">
      <p style="font-size:12px;color:#555;margin:0 0 6px;">Thank you for supporting ABC FC — Lion of the North!</p>
      <p style="font-size:11px;color:#444;margin:0;">Questions? Reply to this email, or reach us at ${esc(SUPPORT_EMAIL)} · ${esc(SUPPORT_PHONE)}</p>
    </td></tr>
  </table>
</body></html>`;
}

function sendInvoice(order) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return Promise.resolve(false);
  const https = require('https');

  const isPending = order.status === 'pending_payment';
  const isPaidOnline = order.status === 'paid' && order.payment === 'online';
  const subject = isPending
    ? `Order Received — Complete Your Payment — ${order.orderNum}`
    : isPaidOnline
      ? `Payment Received — Your ABC Store Order ${order.orderNum}`
      : `Your ABC Store Order — ${order.orderNum}`;

  const payload = JSON.stringify({
    from: 'ABC Store <store@abcfc.store>',
    to: [order.email],
    bcc: ['tshibalo.lucas@gmail.com'],
    reply_to: SUPPORT_EMAIL,
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
