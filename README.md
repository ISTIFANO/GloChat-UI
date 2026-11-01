# marketchat-web

Standalone web app of **MarketChat** (AI-first marketplace). Deployed separately from the backend.
It only talks to the **api-gateway**; no backend secret is ever shipped to the browser.

## Stack
Angular 21 (standalone, signals, zoneless) · Tailwind CSS 4 · GSAP 3 · Vitest · Playwright (e2e)

## Run locally
1. Start the backend (repo `marketchat`): infrastructure + services (`commerce-service` with the `demo` profile + `api-gateway`).
2. `npm install`
3. `npm start` → http://localhost:4200 (the gateway must allow this origin: `CORS_ALLOWED_ORIGINS`).

## Tests
- Unit: `npx ng test --watch=false`
- End-to-end against the **real** backend: `python e2e/catalog.e2e.py http://localhost:4200` (screenshots in `e2e/screenshots/`)

## Configuration
`src/environments/environment.ts` holds **public** values only (gateway URL, Keycloak issuer/client, Stripe publishable key).

## Cart, checkout and payment (Inc 2-4)

- Login: Keycloak, Authorization Code + PKCE (`core/auth`), public client `marketchat-app`, no secret in the bundle.
  Tokens in `sessionStorage` (they survive the Stripe redirect, end with the tab).
- Cart, checkout and orders call the gateway (`core/api/shop-api.ts`); prices always come from the backend.
- Card payment: Stripe-hosted Checkout. Back on `/orders/:number?payment=success` the app asks the backend to verify
  the payment with Stripe server-to-server; the redirect alone is never trusted.

```bash
python e2e/checkout.e2e.py http://localhost:4200   # login, cart, cash order, real Stripe test payment (card 4242)
```
