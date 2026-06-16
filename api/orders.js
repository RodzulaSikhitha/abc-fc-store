// Vercel Serverless Function — /api/orders
// POST: validate + price an order server-side, persist to Neon Postgres,
//       and either email a COD invoice immediately or kick off an iKhokha
//       online payment (the invoice for that is emailed once the payment
//       webhook confirms the funds landed). GET: minimal status lookup
//       (orderNum + email).
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
//  - Online payments are only ever marked "paid" from /api/payment-webhook,
//    which re-verifies status directly with iKhokha rather than trusting
//    the client.

const crypto = require('crypto');
const { byId, deliveryFee } = require('./_catalogue');
const { getSql, ensureSchema } = require('./_db');
const { sendCustomerInvoice, sendAdminOrderNotice } = require('./_invoice');
const { reconcileOnlineOrder } = require('./_payment');
const ikhokha = require('./_ikhokha');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;

const SA_PROVINCES = [
  'Limpopo', 'Gauteng', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape',
  'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
];

// Crockford base32 (no I, L, O, U) → unambiguous order numbers
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function newOrderNum() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += B32[bytes[i] % 32];
  return 'ABC-' + s;
}

// ── Validate + price an order from the client payload ──────
function buildOrder(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid order data' };

  const name  = str(body.name, 120);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const addr  = (body.address && typeof body.address === 'object') ? body.address : {};
  const payment = body.payment === 'online' ? 'online' : 'cod';

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
  if (!SA_PROVINCES.includes(address.province)) return { error: 'Please select a valid province' };

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

  const delivery = deliveryFee(address.province);
  return {
    order: {
      orderNum: newOrderNum(),
      name, email, phone, address, items,
      subtotal, delivery, total: subtotal + delivery,
      payment,
      status: payment === 'online' ? 'pending_payment' : 'received',
      createdAt: new Date().toISOString(),
    },
  };
}

async function persistOrder(sql, order, ip) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await sql`
        INSERT INTO orders (order_num, email, name, phone, address, items, subtotal, delivery, total, payment, status, ip)
        VALUES (${order.orderNum}, ${order.email}, ${order.name}, ${order.phone},
                ${JSON.stringify(order.address)}, ${JSON.stringify(order.items)},
                ${order.subtotal}, ${order.delivery}, ${order.total}, ${order.payment}, ${order.status}, ${ip})`;
      return true;
    } catch (e) {
      if (String(e.message).includes('duplicate') || String(e.code) === '23505') { order.orderNum = newOrderNum(); continue; }
      throw e;
    }
  }
  return false;
}

// ── Handler ────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ---- GET: minimal, email-gated status lookup ----
  if (req.method === 'GET') {
    const orderNum = str(req.query && req.query.orderNum, 20);
    const email    = str(req.query && req.query.email, 200);
    const sql = getSql();
    if (!sql) return res.status(404).json({ error: 'Order not found' });

    // TEMPORARY diagnostic: list the most recent online orders (optionally
    // filtered by email) so a stranded payment can be found even if the
    // email used at checkout is unknown/mistyped.
    // TODO: remove once the live webhook/reconciliation issue is confirmed fixed.
    if (req.query.listRecent === '1') {
      const rows = email
        ? await sql`
            SELECT order_num, email, total, status, paylink_id, created_at
            FROM orders WHERE lower(email) = lower(${email}) AND payment = 'online'
            ORDER BY created_at DESC LIMIT 10`
        : await sql`
            SELECT order_num, email, total, status, paylink_id, created_at
            FROM orders WHERE payment = 'online'
            ORDER BY created_at DESC LIMIT 10`;
      return res.status(200).json({ orders: rows });
    }

    // TEMPORARY diagnostic: confirm exactly what EMAIL_FROM resolves to,
    // since a copy/paste into Vercel's env var UI can silently add quotes
    // or whitespace that breaks the From header's display name.
    if (req.query.checkEmailFrom === '1') {
      return res.status(200).json({
        emailFromRaw: JSON.stringify(process.env.EMAIL_FROM),
        length: process.env.EMAIL_FROM ? process.env.EMAIL_FROM.length : 0,
      });
    }

    // TEMPORARY diagnostic: confirm whether iKhokha paylinks are being
    // created in live or test mode, and which entity, to investigate a
    // real-money mismatch (paylink shows PAID in our reconciliation but
    // no money movement seen in the customer's bank/wallet).
    // TODO: remove once the live-mode investigation is confirmed resolved.
    if (req.query.checkIkhokhaMode === '1') {
      return res.status(200).json({
        mode: process.env.IKHOKHA_MODE || '(default: live)',
        entityId: process.env.IKHOKHA_ENTITY_ID ? '(set, hidden)' : '(falls back to IKHOKHA_APP_ID)',
        configured: ikhokha.isConfigured(),
      });
    }

    if (!orderNum || !email) return res.status(400).json({ error: 'Order number and email are required' });
    try {
      const rows = await sql`
        SELECT order_num, email, name, phone, address, created_at, items, subtotal, delivery, total, payment, status, paylink_id
        FROM orders
        WHERE order_num = ${orderNum} AND lower(email) = lower(${email})
        LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: 'Order not found' });
      const o = rows[0];

      // A customer checking their order status is itself a safe trigger to
      // re-verify with iKhokha directly, in case the webhook callback never
      // arrived or arrived in an unrecognised shape.
      let status = o.status;
      if (status === 'pending_payment' && o.payment === 'online' && o.paylink_id) {
        status = await reconcileOnlineOrder(sql, o);
      }

      const items = Array.isArray(o.items) ? o.items : [];
      const itemCount = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);

      // TEMPORARY diagnostic: surface the raw iKhokha status check so we can
      // see why a stuck payment isn't reconciling, without needing log access.
      // Gated behind the same orderNum+email auth as the rest of this lookup.
      // TODO: remove once the live webhook/reconciliation issue is confirmed fixed.
      let debug;
      if (req.query && req.query.debug === '1') {
        debug = { paylinkId: o.paylink_id || null, payment: o.payment, dbStatus: o.status };
        if (o.paylink_id) {
          try {
            debug.ikhokha = await ikhokha.getStatus(o.paylink_id);
          } catch (e) {
            debug.ikhokhaError = e.message;
          }
        }
      }

      return res.status(200).json({
        orderNum: o.order_num,
        createdAt: o.created_at,
        itemCount,
        total: Number(o.total),
        status: status || 'received and being processed',
        ...(debug ? { debug } : {}),
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

    if (order.payment === 'online' && !ikhokha.isConfigured()) {
      return res.status(503).json({ error: 'Online payment is currently unavailable. Please choose Cash on Delivery.' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
    const sql = getSql();

    // Online payments require persistence (the webhook confirms payment by
    // order number), so without a DB we can't safely offer that path.
    if (order.payment === 'online' && !sql) {
      return res.status(503).json({ error: 'Online payment is currently unavailable. Please choose Cash on Delivery.' });
    }

    let persisted = false;
    if (sql) {
      try {
        await ensureSchema(sql);
        if (ip) {
          const recent = await sql`SELECT count(*)::int AS n FROM orders WHERE ip = ${ip} AND created_at > now() - interval '1 hour'`;
          if (recent[0] && recent[0].n >= 8) {
            return res.status(429).json({ error: 'Too many orders from this connection. Please try again later.' });
          }
        }
        persisted = await persistOrder(sql, order, ip);
      } catch (e) {
        console.error('[orders] persist error:', e.message);
      }
    }

    if (order.payment === 'online') {
      if (!persisted) {
        return res.status(503).json({ error: 'Could not start online payment. Please try again or choose Cash on Delivery.' });
      }
      const origin = `https://${req.headers.host}`;
      try {
        const paylink = await ikhokha.createPaylink({
          amountCents: Math.round(order.total * 100),
          currency: 'ZAR',
          requesterUrl: origin,
          description: `ABC FC Store — Order ${order.orderNum} — ${order.name}`.slice(0, 120),
          paymentReference: `${order.orderNum} ${order.name}`.slice(0, 100),
          externalTransactionID: order.orderNum,
          urls: {
            callbackUrl: `${origin}/api/payment-webhook`,
            successPageUrl: `${origin}/?payment=success&order=${order.orderNum}`,
            failurePageUrl: `${origin}/?payment=failed&order=${order.orderNum}`,
            cancelUrl: `${origin}/?payment=cancelled&order=${order.orderNum}`,
          },
        });
        await sql`UPDATE orders SET paylink_id = ${paylink.paylinkID} WHERE order_num = ${order.orderNum}`;
        // Fire-and-forget — don't delay the redirect to iKhokha waiting on Resend.
        // No admin notice yet: nothing to fulfil until the payment actually lands.
        sendCustomerInvoice({ ...order, paymentUrl: paylink.paylinkUrl }).catch(() => {});
        return res.status(200).json({
          success: true,
          orderNum: order.orderNum,
          subtotal: order.subtotal,
          delivery: order.delivery,
          total: order.total,
          persisted: true,
          online: true,
          paymentUrl: paylink.paylinkUrl,
        });
      } catch (e) {
        console.error('[orders] iKhokha paylink error:', e.message);
        return res.status(503).json({ error: 'Could not start online payment. Please try again or choose Cash on Delivery.' });
      }
    }

    const emailSent = await sendCustomerInvoice(order);
    // COD orders need fulfilment immediately, so notify the team now.
    sendAdminOrderNotice(order).catch(() => {});

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
