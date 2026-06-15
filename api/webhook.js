// /api/webhook.js
// Vercel Serverless Function — receives PeptidePay order.paid events.
// Verifies HMAC signature before trusting the payload.

import crypto from 'node:crypto';

export const config = {
  api: {
    bodyParser: false, // CRITICAL: must read raw bytes for HMAC to work
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const rawBody = await getRawBody(req);
  const header  = req.headers['x-peptidepay-signature'] ?? '';

  const [tPart, v1Part] = header.split(',');
  const t  = tPart?.split('=')[1];
  const v1 = v1Part?.split('=')[1];

  if (!t || !v1) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  // Reject replays older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) {
    return res.status(400).json({ error: 'Stale webhook' });
  }

  const secret = process.env.PEPTIDEPAY_WEBHOOK_SECRET;

  if (secret) {
    // Signed delivery (API key mode) — verify HMAC
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${t}.${rawBody}`)
      .digest('hex');

    const v1Buf       = Buffer.from(v1, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');

    const sigValid =
      v1Buf.length === expectedBuf.length &&
      crypto.timingSafeEqual(v1Buf, expectedBuf);

    if (!sigValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const event = JSON.parse(rawBody.toString('utf8'));

  if (event.event === 'order.paid') {
    // ---------------------------------------------------------------
    // ORDER CONFIRMED — event.order_id, event.txid, event.amount
    // ---------------------------------------------------------------
    // TODO: plug in your order fulfillment logic here:
    //   - Send confirmation email
    //   - Update order status in your DB / sheet
    //   - Trigger shipping notification
    // ---------------------------------------------------------------
    console.log(`✅ Order paid: ${event.order_id} | tx: ${event.txid} | ${event.amount / 100} ${event.currency}`);
  }

  // Always return 200 quickly — process async, never block
  return res.status(200).json({ received: true });
}
