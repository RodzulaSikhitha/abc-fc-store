// Shared Neon Postgres helpers used by /api/orders and /api/payment-webhook.

// Vercel's Neon integration prefixes its auto-created env vars with the
// project name (e.g. "abcfcstore_DATABASE_URL") instead of plain
// "DATABASE_URL". Accept either so we don't depend on that naming.
function findDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const key = Object.keys(process.env).find((k) => /_DATABASE_URL$/.test(k));
  return key ? process.env[key] : null;
}

function getSql() {
  const url = findDatabaseUrl();
  if (!url) return null;
  try {
    const { neon } = require('@neondatabase/serverless');
    return neon(url);
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
      paylink_id  text,
      ip          text,
      created_at  timestamptz DEFAULT now()
    )`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paylink_id text`;
}

module.exports = { getSql, ensureSchema };
