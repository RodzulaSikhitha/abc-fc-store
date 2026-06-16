// Minimal iK Pay API client (iKhokha online payments).
// Auth scheme per iKhokha's official examples (github.com/ikhokha/ik-pay-api-examples):
//   IK-SIGN = HMAC-SHA256(secret, urlPath + jsonBody), hex-encoded
//   IK-APPID = merchant application id
// Both headers are sent on every request; GET requests sign the path only.

const crypto = require('crypto');
const https = require('https');

const HOST = 'api.ikhokha.com';
const BASE_PATH = '/public-api/v1/api';
const NUL = String.fromCharCode(0);

function escapeForSigning(s) {
  return s.replace(/[\\"']/g, '\\$&').split(NUL).join('\\0');
}

function sign(path, bodyStr, secret) {
  const payload = escapeForSigning(path + bodyStr);
  return crypto.createHmac('sha256', secret.trim()).update(payload).digest('hex');
}

function getConfig() {
  const appId = process.env.IKHOKHA_APP_ID;
  const appKey = process.env.IKHOKHA_APP_SECRET;
  if (!appId || !appKey) return null;
  return {
    appId,
    appKey,
    entityId: process.env.IKHOKHA_ENTITY_ID || appId,
    mode: process.env.IKHOKHA_MODE || 'live',
  };
}

function request(method, path, bodyObj) {
  const cfg = getConfig();
  if (!cfg) return Promise.reject(new Error('iKhokha is not configured'));
  const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';
  const signature = sign(path, bodyStr, cfg.appKey);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: HOST,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'IK-APPID': cfg.appId.trim(),
        'IK-SIGN': signature,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (r) => {
      let data = '';
      r.on('data', (c) => { data += c; });
      r.on('end', () => {
        let parsed = {};
        try { parsed = data ? JSON.parse(data) : {}; } catch (_) { /* non-JSON response */ }
        resolve({ status: r.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Creates a hosted payment link. `urls` = { callbackUrl, successPageUrl, failurePageUrl, cancelUrl }.
// `paymentReference` defaults to externalTransactionID but can be overridden
// with something more human-readable (e.g. "Order ABC-XXXX — Jane Doe") so
// the transaction is identifiable from iKhokha's own dashboard, not just our DB.
async function createPaylink({ amountCents, currency, requesterUrl, description, externalTransactionID, paymentReference, urls }) {
  const cfg = getConfig();
  if (!cfg) throw new Error('iKhokha is not configured');
  const path = `${BASE_PATH}/payment`;
  const body = {
    entityID: cfg.entityId,
    externalEntityID: cfg.entityId,
    amount: amountCents,
    currency,
    requesterUrl,
    description,
    paymentReference: paymentReference || externalTransactionID,
    mode: cfg.mode,
    externalTransactionID,
    urls,
  };
  const { status, body: data } = await request('POST', path, body);
  if (status < 200 || status >= 300 || !data.paylinkUrl) {
    throw new Error('iKhokha paylink creation failed: ' + (data.message || status));
  }
  return data; // { responseCode, paylinkUrl, paylinkID, externalTransactionID }
}

// Server-to-server status check — used to confirm a webhook instead of
// trusting the webhook's own body, since it arrives unauthenticated.
async function getStatus(paylinkID) {
  const path = `${BASE_PATH}/getStatus/${encodeURIComponent(paylinkID)}`;
  const { status, body: data } = await request('GET', path, null);
  if (status < 200 || status >= 300) {
    throw new Error('iKhokha status check failed: ' + status);
  }
  return data;
}

module.exports = { createPaylink, getStatus, isConfigured: () => !!getConfig() };
