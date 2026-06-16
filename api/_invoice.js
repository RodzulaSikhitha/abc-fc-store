// Shared order/payment emails — used by /api/orders (order received, COD
// invoice, payment-pending notice) and /api/_payment (payment confirmed
// invoice). Sent via Resend (RESEND_API_KEY). Branding matches the
// storefront (css/store.css): gold #F5A800 on near-black, Bebas Neue /
// Barlow Condensed / Inter font stack, ABC FC logo.
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
const ADMIN_EMAILS = (process.env.ADMIN_NOTIFY_EMAILS || SUPPORT_EMAIL)
  .split(',').map((s) => s.trim()).filter(Boolean);

const FONT_DISPLAY = "'Bebas Neue','Arial Narrow',Arial,sans-serif";
const FONT_SUB = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const FONT_BODY = "'Inter','Helvetica Neue',Arial,sans-serif";

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
    badgeLabel: isPending ? 'Awaiting Payment' : isPaidOnline ? 'Paid' : 'Cash on Delivery',
    badgeColor: isPending ? '#999' : isPaidOnline ? '#2ecc71' : '#F5A800',
  };
}

function itemThumb(item) {
  const product = byId[item.id];
  const imgUrl = product && product.image ? `${SITE_URL}/${product.image}` : null;
  return imgUrl
    ? `<img src="${imgUrl}" width="48" height="48" alt="${esc(item.name)}" style="display:block;border-radius:6px;object-fit:cover;border:1px solid #2a2a2a;" />`
    : '';
}

function itemsTableHTML(order, { showPrice = true } = {}) {
  const rows = order.items.map((item) => {
    const thumb = itemThumb(item);
    return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;font-family:${FONT_BODY};font-size:13px;color:#f0f0f0;">
        <table cellpadding="0" cellspacing="0"><tr>
          ${thumb ? `<td style="padding-right:10px;">${thumb}</td>` : ''}
          <td style="font-family:${FONT_BODY};font-size:13px;color:#f0f0f0;">${esc(item.name)}</td>
        </tr></table>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:${FONT_BODY};font-size:13px;color:#999;">${esc(item.size)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:${FONT_BODY};font-size:13px;color:#999;">${item.qty}</td>
      ${showPrice ? `<td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:right;font-family:${FONT_BODY};font-size:13px;color:#F5A800;font-weight:bold;">R ${(item.price * item.qty).toFixed(2)}</td>` : ''}
    </tr>`;
  }).join('');
  return `
    <table width="100%" style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#1a1a1a;">
        <th style="padding:10px 12px;text-align:left;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Product</th>
        <th style="padding:10px 12px;text-align:center;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Size</th>
        <th style="padding:10px 12px;text-align:center;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Qty</th>
        ${showPrice ? `<th style="padding:10px 12px;text-align:right;font-family:${FONT_SUB};font-size:11px;color:#F5A800;text-transform:uppercase;">Total</th>` : ''}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function emailShellHTML({ title, headline, badgeLabel, badgeColor, orderNum, createdAt, bodyHTML, footerHTML }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
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
        <td><p style="font-family:${FONT_SUB};font-size:22px;font-weight:800;color:#f0f0f0;margin:0;text-transform:uppercase;">${esc(headline)}</p>
          <p style="font-size:13px;color:#999;margin:4px 0 0;">${esc(new Date(createdAt || Date.now()).toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' }))}</p></td>
        <td style="text-align:right;">
          <span style="display:inline-block;background:${badgeColor};color:#0d0d0d;font-family:${FONT_SUB};font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-size:11px;padding:4px 10px;border-radius:20px;margin-bottom:6px;">${esc(badgeLabel)}</span>
          <p style="font-family:${FONT_SUB};font-size:13px;font-weight:700;color:#F5A800;margin:2px 0 0;text-transform:uppercase;">Order Number</p>
          <p style="font-size:18px;font-weight:900;color:#f0f0f0;margin:4px 0 0;">${esc(orderNum)}</p></td>
      </tr></table>
    </td></tr>
    ${bodyHTML}
    <tr><td style="padding:24px 28px;text-align:center;border-top:1px solid #2a2a2a;">
      ${footerHTML}
    </td></tr>
  </table>
</body></html>`;
}

// ── Customer-facing invoice ──────────────────────────────────
function generateCustomerHTML(order) {
  const { isPending, isPaidOnline, badgeLabel, badgeColor } = orderMeta(order);
  const addr = order.address || {};

  let headline, totalLabel, paymentBlock;
  if (isPending) {
    headline = 'Order Received';
    totalLabel = 'Total Due';
    const payUrl = esc(order.paymentUrl || '');
    paymentBlock = `
      <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;font-family:${FONT_SUB};">Payment Status</p>
      <p style="font-size:14px;color:#f0f0f0;margin:0;font-family:${FONT_BODY};">Awaiting payment via iKhokha</p>
      <p style="font-size:12px;color:#999;margin:8px 0 14px;font-family:${FONT_BODY};">We've received your order — it'll be confirmed as soon as your payment of <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong> clears. You'll get a second email the moment that happens.</p>
      ${payUrl ? `<a href="${payUrl}" style="display:inline-block;background:#F5A800;color:#0d0d0d;font-family:${FONT_SUB};font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-size:13px;padding:10px 20px;border-radius:6px;text-decoration:none;">Complete Payment</a>` : ''}`;
  } else if (isPaidOnline) {
    headline = 'Payment Confirmed';
    totalLabel = 'Total Paid';
    paymentBlock = `
      <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;font-family:${FONT_SUB};">Payment Method</p>
      <p style="font-size:14px;color:#f0f0f0;margin:0;font-family:${FONT_BODY};">Paid Online (iKhokha)</p>
      <p style="font-size:12px;color:#999;margin:8px 0 0;font-family:${FONT_BODY};">We've received your payment of <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong>. This is your tax invoice — thank you! We're preparing your order and will be in touch to arrange delivery.</p>`;
  } else {
    headline = 'Order Confirmation';
    totalLabel = 'Total Due on Delivery';
    paymentBlock = `
      <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;font-family:${FONT_SUB};">Payment Method</p>
      <p style="font-size:14px;color:#f0f0f0;margin:0;font-family:${FONT_BODY};">Cash on Delivery</p>
      <p style="font-size:12px;color:#999;margin:8px 0 0;font-family:${FONT_BODY};">Please have <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong> ready in cash when your order is delivered. We'll contact you on ${esc(order.phone || 'the number you gave us')} to arrange delivery.</p>`;
  }

  const bodyHTML = `
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
    <tr><td style="padding:20px 28px 0;">${itemsTableHTML(order)}</td></tr>
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
    </td></tr>`;

  const footerHTML = `
      <p style="font-size:12px;color:#555;margin:0 0 6px;">Thank you for supporting ABC FC — Lion of the North!</p>
      <p style="font-size:11px;color:#444;margin:0;">Questions? Reply to this email, or reach us at ${esc(SUPPORT_EMAIL)} · ${esc(SUPPORT_PHONE)}</p>`;

  return emailShellHTML({
    title: `${headline} ${order.orderNum} - ABC Store`,
    headline, badgeLabel, badgeColor,
    orderNum: order.orderNum, createdAt: order.createdAt,
    bodyHTML, footerHTML,
  });
}

// ── Admin / fulfilment notice ────────────────────────────────
function generateAdminHTML(order) {
  const { isPaidOnline, badgeLabel, badgeColor } = orderMeta(order);
  const addr = order.address || {};
  const headline = 'New Order — Action Required';
  const paymentLine = isPaidOnline
    ? `Paid online via iKhokha — R ${order.total.toFixed(2)} settled.`
    : `Cash on Delivery — collect R ${order.total.toFixed(2)} from the customer on delivery.`;

  const bodyHTML = `
    <tr><td style="padding:20px 28px 0;">
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;">
        <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;font-family:${FONT_SUB};">Action</p>
        <p style="font-size:13px;color:#f0f0f0;margin:0;font-family:${FONT_BODY};">${esc(paymentLine)} Pack the items below and arrange delivery.</p>
      </div>
    </td></tr>
    <tr><td style="padding:20px 28px 0;">
      <table width="100%"><tr>
        <td style="width:50%;vertical-align:top;">
          <p style="font-family:${FONT_SUB};font-size:11px;font-weight:700;color:#F5A800;margin:0 0 8px;text-transform:uppercase;">Customer</p>
          <p style="font-size:14px;color:#f0f0f0;margin:0 0 4px;font-weight:700;">${esc(order.name)}</p>
          <p style="font-size:13px;margin:0 0 2px;"><a href="mailto:${esc(order.email)}" style="color:#999;text-decoration:underline;">${esc(order.email)}</a></p>
          <p style="font-size:13px;margin:0;"><a href="tel:${esc(order.phone)}" style="color:#999;text-decoration:underline;">${esc(order.phone)}</a></p></td>
        <td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="font-family:${FONT_SUB};font-size:11px;font-weight:700;color:#F5A800;margin:0 0 8px;text-transform:uppercase;">Deliver To</p>
          <p style="font-size:13px;color:#f0f0f0;margin:0;line-height:1.7;font-weight:600;">
            ${esc(addr.line1)}${addr.line2 ? '<br/>' + esc(addr.line2) : ''}<br/>
            ${esc(addr.city)}, ${esc(addr.postal)}<br/>${esc(addr.province)}, South Africa</p></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 28px 0;">${itemsTableHTML(order)}</td></tr>
    <tr><td style="padding:16px 28px 0;">
      <table width="100%">
        <tr><td style="padding:6px 0;font-family:${FONT_SUB};font-size:14px;font-weight:800;color:#f0f0f0;text-transform:uppercase;">Order Total</td><td style="padding:6px 0;font-size:18px;font-weight:900;color:#F5A800;text-align:right;">R ${order.total.toFixed(2)}</td></tr>
      </table>
    </td></tr>`;

  const footerHTML = `
      <p style="font-size:11px;color:#444;margin:0;">Order placed ${esc(new Date(order.createdAt || Date.now()).toLocaleString('en-ZA'))}</p>`;

  return emailShellHTML({
    title: `${headline} — ${order.orderNum}`,
    headline, badgeLabel, badgeColor,
    orderNum: order.orderNum, createdAt: order.createdAt,
    bodyHTML, footerHTML,
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
  const { isPending, isPaidOnline, badgeLabel } = orderMeta(order);
  const heading = isPending ? 'Order Received' : isPaidOnline ? 'Payment Confirmed' : 'Order Confirmation';
  const totalLabel = isPending ? 'Total Due' : isPaidOnline ? 'Total Paid' : 'Total Due on Delivery';
  const badgeColor = isPending ? '#888888' : isPaidOnline ? '#1f9d55' : '#c9860b';
  const addr = order.address || {};
  const NAVY = '#0c1830';
  const GOLD = '#F5A800';

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;

      // Header band
      doc.rect(0, 0, pageWidth, 110).fill(NAVY);
      const logo = await getLogoBuffer();
      if (logo) {
        try { doc.image(logo, margin, 28, { width: 54, height: 54 }); } catch (_) {}
      }
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(24)
        .text('ABC STORE', logo ? margin + 64 : margin, 36, { characterSpacing: 1 });
      doc.fillColor('#cfcfcf').font('Helvetica').fontSize(9)
        .text('ABC FC · Lion of the North', logo ? margin + 64 : margin, 64);

      // Status badge top-right
      const badgeW = 130, badgeH = 24;
      doc.roundedRect(pageWidth - margin - badgeW, 40, badgeW, badgeH, 4).fill(badgeColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
        .text(badgeLabel.toUpperCase(), pageWidth - margin - badgeW, 47, { width: badgeW, align: 'center' });

      doc.fillColor('#0d0d0d');
      let y = 134;
      doc.font('Helvetica-Bold').fontSize(17).text(heading, margin, y);
      doc.font('Helvetica').fontSize(10).fillColor('#555');
      doc.text(`Order Number: ${order.orderNum}`, margin, y + 24);
      doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y + 38);

      y += 70;
      const colW = (pageWidth - margin * 2 - 20) / 2;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('BILLED TO', margin, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('DELIVER TO', margin + colW + 20, y);
      doc.font('Helvetica').fontSize(10).fillColor('#333');
      doc.text(order.name, margin, y + 16, { width: colW });
      doc.text(order.email, margin, doc.y, { width: colW });
      if (order.phone) doc.text(order.phone, margin, doc.y, { width: colW });

      const addrLines = [
        addr.line1 || '',
        addr.line2 || '',
        `${addr.city || ''}, ${addr.postal || ''}`,
        `${addr.province || ''}, South Africa`,
      ].filter(Boolean);
      doc.text(addrLines.join('\n'), margin + colW + 20, y + 16, { width: colW });

      y = Math.max(doc.y, y + 70) + 20;

      // Items table
      const cols = { product: margin, size: margin + 250, qty: margin + 340, total: margin + 410 };
      const tableRight = pageWidth - margin;
      doc.rect(margin, y, tableRight - margin, 22).fill('#f0f0f0');
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9);
      doc.text('PRODUCT', cols.product + 8, y + 7);
      doc.text('SIZE', cols.size, y + 7, { width: 70, align: 'center' });
      doc.text('QTY', cols.qty, y + 7, { width: 50, align: 'center' });
      doc.text('TOTAL', cols.total, y + 7, { width: tableRight - cols.total - 8, align: 'right' });
      y += 22;

      doc.font('Helvetica').fontSize(10).fillColor('#222');
      for (const item of order.items) {
        const rowH = 26;
        doc.text(item.name, cols.product + 8, y + 7, { width: 235 });
        doc.text(item.size, cols.size, y + 7, { width: 70, align: 'center' });
        doc.text(String(item.qty), cols.qty, y + 7, { width: 50, align: 'center' });
        doc.text(`R ${(item.price * item.qty).toFixed(2)}`, cols.total, y + 7, { width: tableRight - cols.total - 8, align: 'right' });
        doc.moveTo(margin, y + rowH).lineTo(tableRight, y + rowH).strokeColor('#e2e2e2').stroke();
        y += rowH;
      }

      y += 16;
      doc.font('Helvetica').fontSize(10).fillColor('#555');
      doc.text(`Subtotal`, cols.total - 100, y, { width: 100 });
      doc.text(`R ${order.subtotal.toFixed(2)}`, cols.total, y, { width: tableRight - cols.total - 8, align: 'right' });
      y += 16;
      doc.text(`Delivery`, cols.total - 100, y, { width: 100 });
      doc.text(order.delivery === 0 ? 'FREE' : `R ${order.delivery.toFixed(2)}`, cols.total, y, { width: tableRight - cols.total - 8, align: 'right' });
      y += 22;
      doc.moveTo(cols.total - 100, y).lineTo(tableRight, y).strokeColor('#cccccc').stroke();
      y += 10;
      doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY);
      doc.text(totalLabel.toUpperCase(), cols.total - 100, y, { width: 100 });
      doc.fillColor(GOLD).text(`R ${order.total.toFixed(2)}`, cols.total, y, { width: tableRight - cols.total - 8, align: 'right' });

      // Footer band
      const footerY = doc.page.height - 70;
      doc.rect(0, footerY, pageWidth, 70).fill(NAVY);
      doc.fillColor('#cfcfcf').font('Helvetica').fontSize(9)
        .text('Thank you for supporting ABC FC — Lion of the North!', margin, footerY + 22, { width: pageWidth - margin * 2, align: 'center' });
      doc.text(`Questions? ${SUPPORT_EMAIL} · ${SUPPORT_PHONE}`, margin, footerY + 38, { width: pageWidth - margin * 2, align: 'center' });

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
  const { isPending, isPaidOnline } = orderMeta(order);
  const subject = isPending
    ? `Order Received — Complete Your Payment — ${order.orderNum}`
    : isPaidOnline
      ? `Payment Received — Your ABC Store Order ${order.orderNum}`
      : `Your ABC Store Order — ${order.orderNum}`;

  const attachments = await buildPdfAttachment(order);
  return sendEmail({ to: [order.email], subject, html: generateCustomerHTML(order), attachments });
}

async function sendAdminOrderNotice(order) {
  const subject = `New Order ${order.orderNum} — ${esc(order.name)} (R ${order.total.toFixed(2)})`;
  const attachments = await buildPdfAttachment(order);
  return sendEmail({ to: ADMIN_EMAILS, subject, html: generateAdminHTML(order), attachments });
}

module.exports = { generateInvoicePDF, sendCustomerInvoice, sendAdminOrderNotice };
