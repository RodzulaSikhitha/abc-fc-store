-- ABC FC Store — Neon Postgres schema (reference)
-- The /api/orders function creates this table automatically on first write
-- (CREATE TABLE IF NOT EXISTS). This file is kept for reference and so you
-- can create/inspect it manually in the Neon SQL console if you prefer.

CREATE TABLE IF NOT EXISTS orders (
  id          bigserial PRIMARY KEY,
  order_num   text UNIQUE NOT NULL,        -- e.g. ABC-7K2P9Q (server-generated, unguessable)
  email       text NOT NULL,
  name        text,
  phone       text,
  address     jsonb,
  items       jsonb,
  subtotal    numeric(10,2),
  delivery    numeric(10,2),
  total       numeric(10,2),
  payment     text,                        -- 'cod' for now
  status      text DEFAULT 'received',
  ip          text,                        -- for basic abuse rate-limiting
  created_at  timestamptz DEFAULT now()
);

-- Lookups are by order_num (+ email) and by ip for rate-limiting:
CREATE INDEX IF NOT EXISTS orders_email_idx      ON orders (lower(email));
CREATE INDEX IF NOT EXISTS orders_ip_created_idx ON orders (ip, created_at);
