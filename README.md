LEGO Clicker — Local dev + Stripe scaffold

Quick start (front-end only):

1. Open `index.html` in a browser, or serve the folder:

```powershell
cd 'C:\Users\Media\Desktop\Lego Clicker'
python -m http.server 8000
```

2. Visit http://localhost:8000

Auth and saving:
- Click `Sign Up / Login` in the header to create a local account (stored in `localStorage`).

Gamepasses (real money):
- This project contains a scaffold `server.js` that demonstrates how to create a Stripe Checkout session.
- To enable it you must create a Stripe account, get a secret key, and run the server:

```bash
npm install express stripe cors
STRIPE_SECRET_KEY=sk_test_... node server.js
```

- The client currently calls a simulated `buyPassWithCash()` if no backend is configured. To use the server, modify `buyPassWithCash` in `script.js` to POST `/create-checkout-session` and redirect to the returned `url`.

Security note:
- The server scaffold is minimal and for demo purposes only. For production you must validate webhooks, securely associate purchases with user accounts, and handle retries/failure modes.

