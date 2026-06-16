# ABC FC Store — Official Merchandise

**abcfc.store** · Lion of the North · Thohoyandou, Limpopo

Official merchandise store for ABC FC — African by Choice Football Club. Stream I Champions 2025/26.

## Stack

- Plain HTML / CSS / Vanilla JS — no framework, no build step
- Vercel Serverless Functions (`/api`)
- Vercel KV for order storage (optional — falls back gracefully)
- Resend for invoice emails (optional — add `RESEND_API_KEY` env var)

## Structure

```
/
├── index.html          # Store SPA (shop, checkout, confirmation)
├── css/store.css       # Mobile-first stylesheet
├── js/store.js         # Cart, modal, checkout, order logic
├── images/             # Assets
├── api/
│   ├── orders.js       # POST /api/orders — save order + send invoice email
│   └── products.js     # GET /api/products — product catalogue
└── vercel.json
```

## Deploy to Vercel

1. Import this repo on [vercel.com/new](https://vercel.com/new)
2. Framework Preset: **Other**
3. No Root Directory change needed
4. Add custom domain: `abcfc.store`
5. Env vars (Vercel dashboard → Settings → Environment Variables — never commit these):
   - `RESEND_API_KEY` — enables invoice emails via [resend.com](https://resend.com)
   - `DATABASE_URL` — Neon Postgres connection string (required for online payments — orders must be persisted so the webhook can confirm them)
   - `IKHOKHA_APP_ID` — iK Pay API Application ID, from the iKhokha Merchant Dashboard → Integrations → iK Pay API
   - `IKHOKHA_APP_SECRET` — iK Pay API Application Key/Secret (used to sign requests, never exposed to the browser)
   - `IKHOKHA_ENTITY_ID` — optional, defaults to `IKHOKHA_APP_ID` if unset
   - `IKHOKHA_MODE` — `live` or `test`, defaults to `live`

## Main Site

The main ABC FC website lives at [github.com/RodzulaSikhitha/abc-fc-foundation](https://github.com/RodzulaSikhitha/abc-fc-foundation) and is hosted at `abcfc.co.za`.

## Contact

+27 71 109 2360 · tshibalo.lucas@gmail.com · #LionOfTheNorth
