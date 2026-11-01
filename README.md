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
