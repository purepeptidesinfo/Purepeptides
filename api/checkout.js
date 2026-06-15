// checkout.js
// Wires the Checkout button in the cart drawer to PeptidePay.
// Drop this file into your repo root and add:
//   <script src="checkout.js"></script>  before </body> in index.html

async function initCheckout() {
  // The checkout button is .btn inside .cart-foot
  const cartFoot = document.querySelector('.cart-foot');
  if (!cartFoot) return;

  const checkoutBtn = cartFoot.querySelector('.btn');
  if (!checkoutBtn) return;

  checkoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // --- Read subtotal from .cart-sub b (the blue dollar amount) ---
    const subtotalEl = document.querySelector('.cart-sub b');
    const subtotalText = subtotalEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
    const subtotalUSD = parseFloat(subtotalText);

    if (subtotalUSD < 1) {
      alert('Your cart is empty.');
      return;
    }

    // --- Collect cart items for metadata ---
    const cartItems = [];
    document.querySelectorAll('.citem').forEach(el => {
      const name  = el.querySelector('.ci-top b')?.textContent?.trim();
      const qty   = el.querySelector('.qty span')?.textContent?.trim();
      const price = el.querySelector('.ci-price')?.childNodes[0]?.textContent?.replace(/[^0-9.]/g, '');
      const tier  = el.querySelector('.tier-pills button.active')?.textContent?.trim();
      if (name) cartItems.push({ name, qty, price, tier });
    });

    // --- Disable button & show loading ---
    const originalText = checkoutBtn.textContent;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing…';

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: Math.round(subtotalUSD * 100),
          currency: 'USD',
          items: cartItems,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Redirect to PeptidePay hosted checkout page
      window.location.href = data.url;

    } catch (err) {
      console.error('Checkout error:', err);
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = originalText;
      alert('Something went wrong. Please try again.');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckout);
} else {
  initCheckout();
}
