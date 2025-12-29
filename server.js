// Example Node.js Express server to create Stripe Checkout sessions
// NOTE: This is a scaffold. To use it you'll need to install dependencies and set STRIPE_SECRET_KEY.
// Install: npm install express stripe cors
// Run: STRIPE_SECRET_KEY=sk_test_xxx node server.js

const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

app.post('/create-checkout-session', async (req, res) => {
  const { passId } = req.body;
  // map passId to price (client and server must agree)
  const prices = {
    double: { amount: 199, currency: 'usd', name: '2x Legos / Click' },
    autoBoost: { amount: 99, currency: 'usd', name: 'CPS +50%' },
    autoCollect: { amount: 399, currency: 'usd', name: 'Auto-Collect Drops' },
    goldenHands: { amount: 499, currency: 'usd', name: 'Golden Hands' },
    builder: { amount: 299, currency: 'usd', name: 'Instant Builder' }
  };
  const item = prices[passId];
  if(!item) return res.status(400).json({ error: 'Unknown pass' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: item.currency, product_data: { name: item.name }, unit_amount: item.amount }, quantity: 1 }],
      mode: 'payment',
      success_url: req.headers.origin + '/?success=1',
      cancel_url: req.headers.origin + '/?canceled=1'
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stripe error' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, ()=> console.log('Example Stripe server listening on', PORT));
