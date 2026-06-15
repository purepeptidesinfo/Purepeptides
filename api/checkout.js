export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount_cents, currency, items } = req.body;

  if (!amount_cents || amount_cents < 100) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const idempotencyKey = `pp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const response = await fetch('https://peptide-pay.com/api/v1/checkout/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PEPTIDEPAY_API_KEY}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount_cents,
        currency: currency || 'USD',
        success_url: 'https://purepeptides.supply/index.html',
        cancel_url:  'https://purepeptides.supply/index.html',
        webhook_url: 'https://purepeptides.supply/api/webhook',
        metadata: {
          order_id: idempotencyKey,
          items: JSON.stringify(items || []),
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('PeptidePay error:', err);
      return res.status(502).json({ error: 'Payment provider error', detail: err });
    }

    const session = await response.json();
    return res.status(200).json({ url: session.url, session_id: session.id });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
