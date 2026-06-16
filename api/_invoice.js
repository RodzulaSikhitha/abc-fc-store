// Shared order/payment emails — used by /api/orders (order received, COD
// invoice, payment-pending notice) and /api/_payment (payment confirmed
// invoice). Sent via Resend (RESEND_API_KEY). Branding matches the
// club's official letterhead style (cream #EFEAE0 background, black
// header band, gold #F5A800 accents, Arial/Helvetica) rather than the
// storefront's dark theme — these are printed/forwarded documents, not
// a web page, so they follow ABC FC's own email/invoice templates.
//
// Two distinct emails go out for an order, to two distinct audiences:
//   - sendCustomerInvoice(order)  -> the buyer. Their tax invoice (PDF
//     attached) plus what they bought and what happens next.
//   - sendAdminOrderNotice(order) -> the team (ADMIN_NOTIFY_EMAILS env var,
//     comma-separated; defaults to SUPPORT_EMAIL). Everything needed to
//     fulfil the order: who, where, what, and how it was paid for.
// Callers decide which to send based on what just happened — see the
// call sites in api/orders.js and api/_payment.js.

const { byId } = require('./_catalogue');
const https = require('https');

const SITE_URL = 'https://abcfc.store';
const LOGO_URL = `${SITE_URL}/images/abc-fc-logo.jpeg`;
const SUPPORT_EMAIL = 'sikhitha.r@gmail.com';
const SUPPORT_PHONE = '+27 71 109 2360';
const WHATSAPP_LINK = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}`;
const ETA_DAYS = '3-5';
const ADMIN_EMAILS = (process.env.ADMIN_NOTIFY_EMAILS || SUPPORT_EMAIL)
  .split(',').map((s) => s.trim()).filter(Boolean);

const FONT = "Arial, Helvetica, sans-serif";
const CREAM = '#EFEAE0';
const CREAM_BLOCK = '#FFF8E7';
const INK = '#111111';
const GOLD = '#F5A800';
const LABEL_BROWN = '#9A8159';
const PAID_GREEN = '#1F9D55';
const COD_AMBER = '#C98700';
const PENDING_GREY = '#888888';

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── Shared status meta ───────────────────────────────────────
function orderMeta(order) {
  const isPending = order.status === 'pending_payment';
  const isPaidOnline = order.status === 'paid' && order.payment === 'online';
  const isCOD = !isPending && order.payment === 'cod';
  return {
    isPending, isPaidOnline, isCOD,
    statusLabel: isPending ? 'Awaiting Payment' : isPaidOnline ? 'Paid Online' : 'Cash on Delivery',
    statusColor: isPending ? PENDING_GREY : isPaidOnline ? PAID_GREEN : COD_AMBER,
    paymentMethodLabel: isPending || isPaidOnline ? 'iKhokha (Online)' : 'Cash on Delivery',
  };
}

function invoiceNumber(order) {
  const tail = String(order.orderNum || '').split('-')[1] || order.orderNum;
  return `INV-${tail}`;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || name;
}

function fmtDate(d) {
  return new Date(d || Date.now()).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtDateTime(d) {
  return new Date(d || Date.now()).toLocaleString('en-ZA');
}

function itemThumb(item) {
  const product = byId[item.id];
  const imgUrl = product && product.image ? `${SITE_URL}/${product.image}` : null;
  return imgUrl
    ? `<img src="${imgUrl}" width="40" height="40" alt="${esc(item.name)}" style="display:block;border-radius:6px;object-fit:cover;border:1px solid #EEEEEE;" />`
    : '';
}

function itemsTableHTML(order) {
  const rows = order.items.map((item, i) => {
    const thumb = itemThumb(item);
    const rowBg = i % 2 === 0 ? '#FAFAFA' : '#FFFFFF';
    return `
    <tr style="background-color:${rowBg};">
      <td style="padding:12px;border-bottom:1px solid #EEEEEE;color:${INK};font-size:13px;font-family:${FONT};">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          ${thumb ? `<td style="padding-right:10px;">${thumb}</td>` : ''}
          <td style="font-size:13px;color:${INK};font-family:${FONT};">${esc(item.name)}</td>
        </tr></table>
      </td>
      <td style="padding:12px;border-bottom:1px solid #EEEEEE;color:#555555;font-size:13px;font-family:${FONT};" align="center">${esc(item.size)}</td>
      <td style="padding:12px;border-bottom:1px solid #EEEEEE;color:#555555;font-size:13px;font-family:${FONT};" align="center">${item.qty}</td>
      <td style="padding:12px;border-bottom:1px solid #EEEEEE;color:${INK};font-size:13px;font-weight:bold;font-family:${FONT};" align="right">R ${(item.price * item.qty).toFixed(2)}</td>
    </tr>`;
  }).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr style="background-color:${INK};">
        <td style="padding:10px 12px;color:${GOLD};font-size:11px;font-weight:bold;text-transform:uppercase;font-family:${FONT};">Item</td>
        <td style="padding:10px 12px;color:${GOLD};font-size:11px;font-weight:bold;text-transform:uppercase;font-family:${FONT};" align="center">Size</td>
        <td style="padding:10px 12px;color:${GOLD};font-size:11px;font-weight:bold;text-transform:uppercase;font-family:${FONT};" align="center">Qty</td>
        <td style="padding:10px 12px;color:${GOLD};font-size:11px;font-weight:bold;text-transform:uppercase;font-family:${FONT};" align="right">Total</td>
      </tr>
      ${rows}
    </table>`;
}

function packListHTML(order) {
  const rows = order.items.map((item, i) => `
    <tr style="background-color:${i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'};">
      <td style="padding:14px 12px;border-bottom:1px solid #EEEEEE;color:${INK};font-size:13px;font-family:${FONT};">&#9744; ${esc(item.name)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #EEEEEE;color:#555555;font-size:13px;font-family:${FONT};" align="center">${esc(item.size)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #EEEEEE;color:${INK};font-size:16px;font-weight:bold;font-family:${FONT};" align="center">${item.qty}</td>
    </tr>`).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr style="background-color:${INK};">
        <td style="padding:10px 12px;color:${GOLD};font-size:11px;font-weight:bold;text-transform:uppercase;font-family:${FONT};">Item</td>
        <td style="padding:10px 12px;color:${GOLD};font-size:11px;font-weight:bold;text-transform:uppercase;font-family:${FONT};" align="center">Size</td>
        <td style="padding:10px 12px;color:${GOLD};font-size:11px;font-weight:bold;text-transform:uppercase;font-family:${FONT};" align="center">Qty</td>
      </tr>
      ${rows}
    </table>`;
}

function emailShellHTML({ title, preheader, bodyHTML }) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:10px;overflow:hidden;">
        ${bodyHTML}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function headerRowHTML({ kicker, kickerSub, badgeLabel, badgeColor }) {
  return `
    <tr><td style="background-color:${INK};padding:24px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="56" valign="middle">
          <img src="${LOGO_URL}" width="48" height="48" alt="ABC FC crest" style="display:block;border-radius:50%;border:2px solid ${GOLD};" />
        </td>
        <td valign="middle" style="padding-left:12px;">
          <span style="color:${GOLD};font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;font-family:${FONT};">${esc(kicker)}</span><br/>
          <span style="color:#9A9A9A;font-size:11px;font-family:${FONT};">${esc(kickerSub)}</span>
        </td>
        ${badgeLabel ? `<td align="right" valign="middle">
          <span style="background-color:${badgeColor};color:#FFFFFF;font-size:10px;font-weight:bold;padding:5px 10px;border-radius:12px;font-family:${FONT};">${esc(badgeLabel)}</span>
        </td>` : ''}
      </tr></table>
    </td></tr>
    <tr><td style="background-color:${GOLD};padding:4px 0;"></td></tr>`;
}

// ── Customer-facing order confirmation / invoice email ───────
function generateCustomerHTML(order) {
  const meta = orderMeta(order);
  const addr = order.address || {};
  const name = esc(firstName(order.name));

  let stepLabels, currentStep, extraCTA;
  if (meta.isPending) {
    stepLabels = ['Awaiting payment', 'Order packed', 'Delivered to you'];
    currentStep = 0;
    const payUrl = esc(order.paymentUrl || '');
    extraCTA = payUrl ? `
      <tr><td style="padding:24px 28px 0 28px;" align="center">
        <a href="${payUrl}" style="display:inline-block;background-color:${GOLD};color:${INK};font-size:13px;font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:6px;font-family:${FONT};">Complete Payment</a>
      </td></tr>` : '';
  } else if (meta.isPaidOnline) {
    stepLabels = ['Payment confirmed', 'Order packed', 'Delivered to you'];
    currentStep = 0;
    extraCTA = '';
  } else {
    stepLabels = ['Order received', 'Order packed', 'Delivered to you'];
    currentStep = 0;
    extraCTA = '';
  }

  const stepsHTML = stepLabels.map((label, i) => `
    <td width="33%" align="center" style="padding:8px;">
      <span style="display:inline-block;width:36px;height:36px;line-height:36px;background-color:${i <= currentStep ? GOLD : '#EEEEEE'};border-radius:50%;color:${i <= currentStep ? INK : '#999999'};font-weight:bold;font-size:14px;font-family:${FONT};">${i + 1}</span>
      <p style="margin:8px 0 0 0;color:#333333;font-size:12px;font-family:${FONT};">${esc(label)}</p>
    </td>`).join('');

  const heroLine = meta.isPending
    ? `Your order is ready to go — just complete payment below and we'll get it packed. Here's everything you need to know about order <strong style="color:${INK};">${esc(order.orderNum)}</strong>.`
    : `Your gear from the Lion of the North pride is being prepared. Here's everything you need to know about order <strong style="color:${INK};">${esc(order.orderNum)}</strong>.`;

  const bodyHTML = `
    ${headerRowHTML({ kicker: 'ABC FC Official Store', kickerSub: 'Lion of the North · Est. 2008', badgeLabel: null, badgeColor: null })}
    <tr><td style="padding:32px 28px 8px 28px;">
      <p style="margin:0 0 6px 0;color:${GOLD};font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-family:${FONT};">${meta.isPending ? '⏳ Order Received' : '✅ Order Confirmed'}</p>
      <h1 style="margin:0 0 10px 0;color:${INK};font-size:24px;font-family:${FONT};">Thanks for your order, ${name}!</h1>
      <p style="margin:0;color:#555555;font-size:14px;line-height:1.6;font-family:${FONT};">${heroLine}</p>
    </td></tr>
    <tr><td style="padding:20px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM_BLOCK};border-radius:8px;"><tr>
        <td style="padding:14px 16px;" width="33%">
          <span style="display:block;color:${LABEL_BROWN};font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;font-family:${FONT};">Order Number</span>
          <span style="display:block;color:${INK};font-size:14px;font-weight:bold;font-family:${FONT};">${esc(order.orderNum)}</span>
        </td>
        <td style="padding:14px 16px;" width="33%">
          <span style="display:block;color:${LABEL_BROWN};font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;font-family:${FONT};">Order Date</span>
          <span style="display:block;color:${INK};font-size:14px;font-weight:bold;font-family:${FONT};">${esc(fmtDate(order.createdAt))}</span>
        </td>
        <td style="padding:14px 16px;" width="34%">
          <span style="display:block;color:${LABEL_BROWN};font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;font-family:${FONT};">Payment</span>
          <span style="display:block;color:${INK};font-size:14px;font-weight:bold;font-family:${FONT};">${esc(meta.statusLabel)}</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 28px 0 28px;">
      <h2 style="margin:0 0 12px 0;color:${INK};font-size:15px;font-family:${FONT};text-transform:uppercase;letter-spacing:0.5px;">Your Items</h2>
      ${itemsTableHTML(order)}
    </td></tr>
    <tr><td style="padding:16px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:6px 0;color:#777777;font-size:13px;font-family:${FONT};" align="right" width="80%">Subtotal</td><td style="padding:6px 0;color:#333333;font-size:13px;font-family:${FONT};" align="right" width="20%">R ${order.subtotal.toFixed(2)}</td></tr>
        <tr><td style="padding:6px 0;color:#777777;font-size:13px;font-family:${FONT};" align="right">Delivery</td><td style="padding:6px 0;color:#333333;font-size:13px;font-family:${FONT};" align="right">R ${order.delivery.toFixed(2)}</td></tr>
        <tr><td style="padding:12px 0 6px 0;border-top:2px solid ${INK};color:${INK};font-size:15px;font-weight:bold;font-family:${FONT};" align="right">${meta.isCOD ? 'Total Due on Delivery' : 'Total Due'}</td>
            <td style="padding:12px 8px 6px 8px;border-top:2px solid ${INK};color:${GOLD};font-size:17px;font-weight:bold;font-family:${FONT};background-color:${INK};white-space:nowrap;" align="right">R ${order.total.toFixed(2)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:28px 28px 0 28px;">
      <h2 style="margin:0 0 10px 0;color:${INK};font-size:15px;font-family:${FONT};text-transform:uppercase;letter-spacing:0.5px;">Delivery Details</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM_BLOCK};border-radius:8px;"><tr>
        <td style="padding:16px;">
          <p style="margin:0;color:${INK};font-size:13px;line-height:1.6;font-family:${FONT};">
            <strong>${esc(order.name)}</strong><br/>
            ${esc(addr.line1)}${addr.line2 ? ', ' + esc(addr.line2) : ''}<br/>
            ${esc(addr.city)}, ${esc(addr.province)} ${esc(addr.postal)}<br/>
            &#128222; ${esc(order.phone)}
          </p>
        </td>
      </tr></table>
      <p style="margin:14px 0 0 0;color:#777777;font-size:12px;font-family:${FONT};">&#128666; Estimated delivery: <strong style="color:${INK};">${ETA_DAYS} business days</strong> via courier nationwide.</p>
    </td></tr>
    <tr><td style="padding:28px 28px 0 28px;">
      <h2 style="margin:0 0 12px 0;color:${INK};font-size:15px;font-family:${FONT};text-transform:uppercase;letter-spacing:0.5px;">What Happens Next</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${stepsHTML}</tr></table>
    </td></tr>
    ${extraCTA}
    <tr><td style="padding:28px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${INK};border-radius:8px;"><tr>
        <td style="padding:18px 20px;" align="center">
          <p style="margin:0 0 8px 0;color:#FFFFFF;font-size:13px;font-family:${FONT};">Questions about your order?</p>
          <a href="${WHATSAPP_LINK}" style="display:inline-block;background-color:${GOLD};color:${INK};font-size:12px;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:6px;font-family:${FONT};">WhatsApp Us: ${esc(SUPPORT_PHONE)}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 28px 24px 28px;" align="center">
      <img src="${LOGO_URL}" width="40" height="40" alt="ABC FC" style="display:block;margin:0 auto 10px auto;border-radius:50%;" />
      <p style="margin:0 0 4px 0;color:#999999;font-size:11px;font-family:${FONT};">ABC FC Foundation &middot; African by Choice Football Club</p>
      <p style="margin:0 0 4px 0;color:#999999;font-size:11px;font-family:${FONT};">Registered Non-Profit Organisation &middot; Thohoyandou, Limpopo, South Africa</p>
      <p style="margin:12px 0 0 0;color:#BBBBBB;font-size:11px;font-family:${FONT};">
        <a href="https://abcfc.co.za" style="color:${LABEL_BROWN};text-decoration:none;">abcfc.co.za</a> &nbsp;&middot;&nbsp;
        <a href="${SITE_URL}" style="color:${LABEL_BROWN};text-decoration:none;">abcfc.store</a> &nbsp;&middot;&nbsp;
        <a href="https://www.facebook.com/p/ABC-fc-61556965480952/" style="color:${LABEL_BROWN};text-decoration:none;">Facebook</a>
      </p>
    </td></tr>`;

  return emailShellHTML({
    title: `ABC FC Store — Order ${meta.isPending ? 'Received' : 'Confirmation'}`,
    preheader: `Your order ${order.orderNum} is ${meta.isPending ? 'received — complete payment to confirm' : 'confirmed'} — thanks for backing the Lion of the North!`,
    bodyHTML,
  });
}

// ── Admin / fulfilment notice ────────────────────────────────
function generateAdminHTML(order) {
  const meta = orderMeta(order);
  const addr = order.address || {};
  const paymentLine = meta.isPaidOnline
    ? `Paid online via iKhokha — R ${order.total.toFixed(2)} settled.`
    : `Cash on Delivery — collect R ${order.total.toFixed(2)} from the customer on delivery.`;

  const bodyHTML = `
    ${headerRowHTML({ kicker: 'ABC FC Store · Ops', kickerSub: 'Internal Fulfilment Notice', badgeLabel: meta.statusLabel, badgeColor: meta.statusColor })}
    <tr><td style="padding:28px 28px 8px 28px;">
      <p style="margin:0 0 6px 0;color:${GOLD};font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-family:${FONT};">&#127991; New Order To Fulfil</p>
      <h1 style="margin:0;color:${INK};font-size:23px;font-family:${FONT};">Order ${esc(order.orderNum)}</h1>
      <p style="margin:6px 0 0 0;color:#777777;font-size:12px;font-family:${FONT};">Placed ${esc(fmtDateTime(order.createdAt))}</p>
      <p style="margin:10px 0 0 0;color:#333333;font-size:13px;font-family:${FONT};">${esc(paymentLine)} Pack the items below and arrange delivery.</p>
    </td></tr>
    <tr><td style="padding:24px 28px 0 28px;">
      <h2 style="margin:0 0 12px 0;color:${INK};font-size:15px;font-family:${FONT};text-transform:uppercase;letter-spacing:0.5px;">&#128230; Pack List</h2>
      ${packListHTML(order)}
    </td></tr>
    <tr><td style="padding:24px 28px 0 28px;">
      <h2 style="margin:0 0 10px 0;color:${INK};font-size:15px;font-family:${FONT};text-transform:uppercase;letter-spacing:0.5px;">&#128666; Deliver To</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM_BLOCK};border-radius:8px;"><tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 10px 0;color:${INK};font-size:14px;font-weight:bold;font-family:${FONT};">${esc(order.name)}</p>
          <p style="margin:0 0 10px 0;color:#333333;font-size:13px;line-height:1.6;font-family:${FONT};">
            ${esc(addr.line1)}${addr.line2 ? ', ' + esc(addr.line2) : ''}<br/>
            ${esc(addr.city)}, ${esc(addr.province)} ${esc(addr.postal)}
          </p>
          <p style="margin:0;color:#333333;font-size:13px;font-family:${FONT};">&#128222; ${esc(order.phone)} &nbsp;&middot;&nbsp; &#9993;&#65039; ${esc(order.email)}</p>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:6px 0;color:#777777;font-size:13px;font-family:${FONT};" align="right" width="75%">Delivery Fee</td><td style="padding:6px 0;color:#333333;font-size:13px;font-family:${FONT};" align="right" width="25%">R ${order.delivery.toFixed(2)}</td></tr>
        <tr><td style="padding:10px 0;border-top:2px solid ${INK};color:${INK};font-size:14px;font-weight:bold;font-family:${FONT};" align="right">Order Total</td><td style="padding:10px 0;border-top:2px solid ${INK};color:${INK};font-size:14px;font-weight:bold;font-family:${FONT};" align="right">R ${order.total.toFixed(2)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:24px 28px 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="50%" align="center" style="padding-right:6px;">
          <a href="mailto:${esc(order.email)}" style="display:block;background-color:${GOLD};color:${INK};font-size:13px;font-weight:bold;text-decoration:none;padding:13px 0;border-radius:6px;font-family:${FONT};">&#9993;&#65039; Email Customer</a>
        </td>
        <td width="50%" align="center" style="padding-left:6px;">
          <a href="tel:${esc(order.phone)}" style="display:block;background-color:${INK};color:${GOLD};font-size:13px;font-weight:bold;text-decoration:none;padding:13px 0;border-radius:6px;font-family:${FONT};">&#128222; Call ${esc(firstName(order.name))}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 28px 24px 28px;" align="center">
      <p style="margin:0;color:#999999;font-size:11px;font-family:${FONT};">Auto-generated by abcfc.store on every new order &middot; Lion of the North</p>
    </td></tr>`;

  return emailShellHTML({
    title: `New Order to Fulfil — ${order.orderNum}`,
    preheader: `Order ${order.orderNum} needs packing — ${meta.statusLabel}`,
    bodyHTML,
  });
}

// ── PDF invoice (customer copy) ──────────────────────────────
let logoBufferPromise = null;
function fetchBuffer(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: timeoutMs }, (r) => {
      if (r.statusCode !== 200) { r.resume(); return resolve(null); }
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}
function getLogoBuffer() {
  if (!logoBufferPromise) logoBufferPromise = fetchBuffer(LOGO_URL);
  return logoBufferPromise;
}

function generateInvoicePDF(order) {
  const PDFDocument = require('pdfkit');
  const meta = orderMeta(order);
  const addr = order.address || {};
  const statusColor = meta.isPaidOnline ? PAID_GREEN : meta.isCOD ? COD_AMBER : '#888888';

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;
      const right = pageWidth - margin;

      // Header: logo + brand block (left), INVOICE title + meta (right)
      const logo = await getLogoBuffer();
      let y = 40;
      if (logo) {
        try { doc.save(); doc.circle(margin + 31, y + 31, 31).clip(); doc.image(logo, margin, y, { width: 62, height: 62 }); doc.restore(); } catch (_) {}
      }
      const textX = margin + 76;
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('ABC FC OFFICIAL STORE', textX, y, { characterSpacing: 0.5 });
      doc.fillColor('#8A8A8A').font('Helvetica').fontSize(8.5);
      doc.text('African by Choice Football Club · Lion of the North · Est. 2008', textX, y + 16);
      doc.text('Thohoyandou, Vhembe District, Limpopo, South Africa', textX, y + 28);
      doc.text(`${SUPPORT_PHONE} · ${SUPPORT_EMAIL}`, textX, y + 40);

      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(26).text('INVOICE', margin, y, { width: right - margin, align: 'right' });
      doc.fillColor('#555555').font('Helvetica').fontSize(9.5);
      const invMeta = [
        `Invoice No: ${invoiceNumber(order)}`,
        `Order No: ${order.orderNum}`,
        `Date: ${fmtDate(order.createdAt)}`,
      ];
      doc.text(invMeta.join('\n'), margin, y + 36, { width: right - margin, align: 'right', lineGap: 2 });

      y += 90;
      doc.rect(margin, y, right - margin, 4).fill(GOLD);
      y += 22;

      // Billed/Delivered To + Order Summary
      const colW = (right - margin - 20) / 2;
      doc.fillColor(LABEL_BROWN).font('Helvetica-Bold').fontSize(9.5).text('BILLED & DELIVERED TO', margin, y, { characterSpacing: 0.3 });
      doc.text('ORDER SUMMARY', margin + colW + 20, y, { characterSpacing: 0.3 });
      y += 14;

      const blockH = 80;
      doc.roundedRect(margin, y, colW, blockH, 6).fill(CREAM_BLOCK);
      doc.roundedRect(margin + colW + 20, y, colW, blockH, 6).fill(CREAM_BLOCK);

      doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(order.name, margin + 14, y + 12, { width: colW - 28 });
      doc.font('Helvetica').fontSize(10).fillColor('#2A2A2A');
      const addrLines = [
        `${addr.line1 || ''}${addr.line2 ? ', ' + addr.line2 : ''}`,
        `${addr.city || ''}, ${addr.province || ''} ${addr.postal || ''}`,
        `${order.phone || ''} · ${order.email || ''}`,
      ];
      doc.text(addrLines.join('\n'), margin + 14, y + 30, { width: colW - 28, lineGap: 3 });

      const sumX = margin + colW + 20 + 14;
      doc.font('Helvetica').fontSize(10).fillColor('#2A2A2A');
      doc.text('Payment Method:', sumX, y + 12, { continued: true }).font('Helvetica-Bold').fillColor(INK).text(` ${meta.paymentMethodLabel}`);
      doc.font('Helvetica').fillColor('#2A2A2A').text('Payment Status:', sumX, y + 28);
      doc.roundedRect(sumX, y + 41, 110, 16, 8).fill(statusColor);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text(meta.statusLabel.toUpperCase(), sumX, y + 45, { width: 110, align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#2A2A2A').text('Delivery Method:', sumX, y + 64, { continued: true }).font('Helvetica-Bold').fillColor(INK).text(` Courier · ${ETA_DAYS} business days`);

      y += blockH + 26;

      // Items table
      const cols = { product: margin, size: margin + 220, qty: margin + 290, unit: margin + 350, total: margin + 440 };
      doc.rect(margin, y, right - margin, 24).fill(INK);
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9);
      doc.text('ITEM', cols.product + 10, y + 8);
      doc.text('SIZE', cols.size, y + 8, { width: 60, align: 'center' });
      doc.text('QTY', cols.qty, y + 8, { width: 50, align: 'center' });
      doc.text('UNIT PRICE', cols.unit, y + 8, { width: 80, align: 'right' });
      doc.text('LINE TOTAL', cols.total, y + 8, { width: right - cols.total - 10, align: 'right' });
      y += 24;

      doc.font('Helvetica').fontSize(10);
      order.items.forEach((item, i) => {
        const rowH = 26;
        doc.rect(margin, y, right - margin, rowH).fill(i % 2 === 0 ? '#FAFAFA' : '#FFFFFF');
        doc.fillColor('#2A2A2A');
        doc.text(item.name, cols.product + 10, y + 8, { width: 200 });
        doc.text(item.size, cols.size, y + 8, { width: 60, align: 'center' });
        doc.text(String(item.qty), cols.qty, y + 8, { width: 50, align: 'center' });
        doc.text(`R ${item.price.toFixed(2)}`, cols.unit, y + 8, { width: 80, align: 'right' });
        doc.text(`R ${(item.price * item.qty).toFixed(2)}`, cols.total, y + 8, { width: right - cols.total - 10, align: 'right' });
        doc.moveTo(margin, y + rowH).lineTo(right, y + rowH).strokeColor('#ECECEC').stroke();
        y += rowH;
      });

      y += 18;
      const totalsX = right - 220;
      doc.font('Helvetica').fontSize(10.5).fillColor('#555555');
      doc.text('Subtotal', totalsX, y, { width: 120 });
      doc.fillColor('#2A2A2A').text(`R ${order.subtotal.toFixed(2)}`, right - 100, y, { width: 100, align: 'right' });
      y += 16;
      doc.fillColor('#555555').text('Delivery Fee', totalsX, y, { width: 120 });
      doc.fillColor('#2A2A2A').text(`R ${order.delivery.toFixed(2)}`, right - 100, y, { width: 100, align: 'right' });
      y += 22;
      doc.moveTo(totalsX, y).lineTo(right, y).strokeColor(INK).lineWidth(1.5).stroke();
      y += 8;
      doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(meta.isCOD ? 'Total Due' : 'Total Due', totalsX, y, { width: 120 });
      doc.rect(right - 100, y - 4, 100, 20).fill(INK);
      doc.fillColor(GOLD).text(`R ${order.total.toFixed(2)}`, right - 100, y, { width: 100, align: 'right' });

      y += 50;
      doc.roundedRect(margin, y, right - margin, 44, 8).fill(INK);
      doc.fillColor('#FFFFFF').font('Helvetica').fontSize(11)
        .text('Thank you for backing the ', margin, y + 16, { continued: true })
        .fillColor(GOLD).font('Helvetica-Bold').text('Lion of the North', { continued: true })
        .fillColor('#FFFFFF').font('Helvetica').text(' — #We_Remain_Humble');
      doc.text('', margin, y + 16); // reset cursor alignment side-effects

      const footerY = doc.page.height - 60;
      doc.moveTo(margin, footerY).lineTo(right, footerY).strokeColor('#EEEEEE').lineWidth(1).stroke();
      doc.fillColor('#999999').font('Helvetica').fontSize(8.5)
        .text('ABC FC Foundation · Registered Non-Profit Organisation, South Africa · abcfc.co.za · abcfc.store', margin, footerY + 10, { width: right - margin, align: 'center' })
        .text(`This is a computer-generated invoice for order ${order.orderNum}. Queries: ${SUPPORT_EMAIL} · ${SUPPORT_PHONE}`, margin, footerY + 22, { width: right - margin, align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ── Resend transport ──────────────────────────────────────────
function sendEmail({ to, subject, html, attachments }) {
  const RESEND_KEY = process.env.RESEND_API_KEY || process.env.RESEND_API;
  if (!RESEND_KEY) return Promise.resolve(false);

  const from = process.env.EMAIL_FROM || 'ABC Store <onboarding@resend.dev>';
  const payload = JSON.stringify({
    from,
    to,
    reply_to: SUPPORT_EMAIL,
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (r) => {
      let body = '';
      r.on('data', (c) => { body += c; });
      r.on('end', () => {
        const ok = r.statusCode >= 200 && r.statusCode < 300;
        if (!ok) console.error('[invoice] Resend send failed:', r.statusCode, body);
        resolve(ok);
      });
    });
    req.on('error', (e) => { console.error('[invoice] Resend request error:', e.message); resolve(false); });
    req.write(payload); req.end();
  });
}

async function buildPdfAttachment(order) {
  try {
    const pdf = await generateInvoicePDF(order);
    return [{ filename: `ABC-Store-Invoice-${order.orderNum}.pdf`, content: pdf.toString('base64') }];
  } catch (e) {
    console.error('[invoice] PDF generation failed:', e.message);
    return undefined;
  }
}

// ── Public API ────────────────────────────────────────────────
async function sendCustomerInvoice(order) {
  const meta = orderMeta(order);
  const subject = meta.isPending
    ? `Order Received — Complete Your Payment — ${order.orderNum}`
    : meta.isPaidOnline
      ? `Payment Received — Your ABC Store Order ${order.orderNum}`
      : `Your ABC Store Order — ${order.orderNum}`;

  const attachments = await buildPdfAttachment(order);
  return sendEmail({ to: [order.email], subject, html: generateCustomerHTML(order), attachments });
}

async function sendAdminOrderNotice(order) {
  const subject = `New Order ${order.orderNum} — ${order.name} (R ${order.total.toFixed(2)})`;
  const attachments = await buildPdfAttachment(order);
  return sendEmail({ to: ADMIN_EMAILS, subject, html: generateAdminHTML(order), attachments });
}

module.exports = { generateInvoicePDF, sendCustomerInvoice, sendAdminOrderNotice };
