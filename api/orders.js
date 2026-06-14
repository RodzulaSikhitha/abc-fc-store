// Vercel Serverless Function — /api/orders
// POST: validate + price an order server-side, persist to Neon Postgres,
//       email a COD invoice. GET: minimal status lookup (orderNum + email).
//
// Security posture:
//  - Prices/totals are recomputed from the server catalogue; client prices
//    are ignored (no price tampering).
//  - Order numbers are server-generated and unguessable.
//  - The GET lookup requires BOTH order number AND matching email, and
//    returns only a minimal status (never address/phone) — closing the
//    previous brute-forceable PII leak.
//  - CORS is NOT opened to "*"; the storefront calls this same-origin.
//  - Internal error details are logged, never returned to the client.

const crypto = require('crypto');
const { byId, deliveryFee } = require('./_catalogue');

// ── Helpers ────────────────────────────────────────────────
const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Crockford base32 (no I, L, O, U) → unambiguous order numbers
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function newOrderNum() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += B32[bytes[i] % 32];
  return 'ABC-' + s;
}

// Lazily get a Neon SQL client; returns null if not configured/installed.
function getSql() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { neon } = require('@neondatabase/serverless');
    return neon(process.env.DATABASE_URL);
  } catch (_) {
    return null;
  }
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id          bigserial PRIMARY KEY,
      order_num   text UNIQUE NOT NULL,
      email       text NOT NULL,
      name        text,
      phone       text,
      address     jsonb,
      items       jsonb,
      subtotal    numeric(10,2),
      delivery    numeric(10,2),
      total       numeric(10,2),
      payment     text,
      status      text DEFAULT 'received',
      ip          text,
      created_at  timestamptz DEFAULT now()
    )`;
}

// ── Validate + price an order from the client payload ──────
function buildOrder(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid order data' };

  const name  = str(body.name, 120);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const addr  = (body.address && typeof body.address === 'object') ? body.address : {};

  if (!name) return { error: 'Name is required' };
  if (!isEmail(email)) return { error: 'A valid email is required' };

  const address = {
    line1:    str(addr.line1, 160),
    line2:    str(addr.line2, 160),
    city:     str(addr.city, 80),
    postal:   str(addr.postal, 12),
    province: str(addr.province, 40),
  };
  if (!address.line1 || !address.city || !address.postal) return { error: 'A complete delivery address is required' };
  // COD is Limpopo-only for now.
  if (address.province !== 'Limpopo') return { error: 'We currently deliver within Limpopo only' };

  if (!Array.isArray(body.items) || body.items.length === 0) return { error: 'Your cart is empty' };
  if (body.items.length > 50) return { error: 'Too many items' };

  const items = [];
  let subtotal = 0;
  for (const raw of body.items) {
    if (!raw || typeof raw !== 'object') return { error: 'Invalid item' };
    const product = byId[raw.id];
    if (!product) return { error: 'Unknown product in cart' };
    if (product.soldOut) return { error: `${product.name} is sold out` };
    const size = str(raw.size, 20);
    if (!product.sizes.includes(size)) return { error: `Invalid size for ${product.name}` };
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return { error: 'Invalid quantity' };
    subtotal += product.price * qty;
    items.push({ id: product.id, name: product.name, size, qty, price: product.price });
  }

  const delivery = deliveryFee(subtotal);
  return {
    order: {
      orderNum: newOrderNum(),
      name, email, phone, address, items,
      subtotal, delivery, total: subtotal + delivery,
      payment: 'cod', // forced — COD only for now
      createdAt: new Date().toISOString(),
    },
  };
}

// ── Invoice email (Cash on Delivery) ───────────────────────
function generateInvoiceHTML(order) {
  const orderNum = esc(order.orderNum);
  const itemsRows = order.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;font-family:sans-serif;font-size:13px;color:#f0f0f0;">${esc(item.name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:sans-serif;font-size:13px;color:#999;">${esc(item.size)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:center;font-family:sans-serif;font-size:13px;color:#999;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:right;font-family:sans-serif;font-size:13px;color:#F5A800;font-weight:bold;">R ${(item.price * item.qty).toFixed(2)}</td>
    </tr>`).join('');
  const addr = order.address || {};

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
        <tr><td style="padding:6px 0;font-size:16px;font-weight:900;color:#f0f0f0;text-transform:uppercase;">Total Due on Delivery</td><td style="padding:6px 0;font-size:20px;font-weight:900;color:#F5A800;text-align:right;">R ${order.total.toFixed(2)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;">
        <p style="font-size:11px;font-weight:700;color:#F5A800;margin:0 0 6px;text-transform:uppercase;">Payment Method</p>
        <p style="font-size:14px;color:#f0f0f0;margin:0;">Cash on Delivery (Limpopo)</p>
        <p style="font-size:12px;color:#999;margin:8px 0 0;">Please have <strong style="color:#ccc;">R ${order.total.toFixed(2)}</strong> ready in cash when your order is delivered. We'll contact you to arrange delivery.</p>
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
  const payload = JSON.stringify({
    from: 'ABC FC Store <store@abcfc.store>',
    to: [order.email],
    bcc: ['tshibalo.lucas@gmail.com'],
    subject: `Your ABC FC Order — ${order.orderNum}`,
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

// ── Handler ────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ---- GET: minimal, email-gated status lookup ----
  if (req.method === 'GET') {
    const orderNum = str(req.query && req.query.orderNum, 20);
    const email    = str(req.query && req.query.email, 200);
    if (!orderNum || !email) return res.status(400).json({ error: 'Order number and email are required' });
    const sql = getSql();
    if (!sql) return res.status(404).json({ error: 'Order not found' });
    try {
      const rows = await sql`
        SELECT order_num, created_at, items, total, status
        FROM orders
        WHERE order_num = ${orderNum} AND lower(email) = lower(${email})
        LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: 'Order not found' });
      const o = rows[0];
      const items = Array.isArray(o.items) ? o.items : [];
      const itemCount = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      return res.status(200).json({
        orderNum: o.order_num,
        createdAt: o.created_at,
        itemCount,
        total: Number(o.total),
        status: o.status || 'received and being processed',
      });
    } catch (err) {
      console.error('[orders] lookup error:', err.message);
      return res.status(503).json({ error: 'Lookup temporarily unavailable' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ---- POST: place an order ----
  try {
    const built = buildOrder(req.body);
    if (built.error) return res.status(400).json({ error: built.error });
    const order = built.order;

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;

    // Persist to Neon (+ light per-IP rate limit). Graceful if not configured.
    let persisted = false;
    const sql = getSql();
    if (sql) {
      try {
        await ensureSchema(sql);
        if (ip) {
          const recent = await sql`SELECT count(*)::int AS n FROM orders WHERE ip = ${ip} AND created_at > now() - interval '1 hour'`;
          if (recent[0] && recent[0].n >= 8) {
            return res.status(429).json({ error: 'Too many orders from this connection. Please try again later.' });
          }
        }
        // Insert with a few retries in case of an order-number collision.
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await sql`
              INSERT INTO orders (order_num, email, name, phone, address, items, subtotal, delivery, total, payment, ip)
              VALUES (${order.orderNum}, ${order.email}, ${order.name}, ${order.phone},
                      ${JSON.stringify(order.address)}, ${JSON.stringify(order.items)},
                      ${order.subtotal}, ${order.delivery}, ${order.total}, ${order.payment}, ${ip})`;
            persisted = true;
            break;
          } catch (e) {
            if (String(e.message).includes('duplicate') || String(e.code) === '23505') { order.orderNum = newOrderNum(); continue; }
            throw e;
          }
        }
      } catch (e) {
        console.error('[orders] persist error:', e.message);
      }
    }

    const emailSent = await sendInvoice(order);

    return res.status(200).json({
      success: true,
      orderNum: order.orderNum,
      subtotal: order.subtotal,
      delivery: order.delivery,
      total: order.total,
      persisted,
      emailSent,
    });
  } catch (err) {
    console.error('[orders] handler error:', err.message);
    return res.status(500).json({ error: 'Could not process your order. Please try again or contact us.' });
  }
};
