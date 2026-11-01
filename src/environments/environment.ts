/**
 * Runtime configuration, read from `/config.json` before the app starts (see main.ts), so one build
 * runs in every environment. The file is generated from environment variables by
 * `scripts/write-config.mjs` (`npm start` / `npm run build` do it) or written by the host at deploy time.
 *
 * PUBLIC values only: everything here is visible in the browser. Backend secrets never come here.
 */
export interface Environment {
  /** api-gateway origin (all calls go through it); empty string = same origin as the web app */
  apiBaseUrl: string;
  keycloak: { issuer: string; clientId: string };
  /** where the catalog is browsed until the customer picks an address */
  defaultLocation: { label: string; lat: number; lng: number };
}

export const environment: Environment = {
  apiBaseUrl: '',
  keycloak: { issuer: '', clientId: '' },
  defaultLocation: { label: '', lat: 0, lng: 0 },
};

/** Loads `/config.json` into {@link environment}; fails loudly when a required value is missing. */
export async function loadEnvironment(url = '/config.json'): Promise<void> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} not found (HTTP ${res.status}): run "npm run config"`);
  const cfg = (await res.json()) as Partial<Environment>;
  const issuer = cfg.keycloak?.issuer?.replace(/\/+$/, '');
  const clientId = cfg.keycloak?.clientId;
  const loc = cfg.defaultLocation;
  if (typeof cfg.apiBaseUrl !== 'string' || !issuer || !clientId || !loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
    throw new Error(`${url}: apiBaseUrl, keycloak.issuer, keycloak.clientId and defaultLocation are required`);
  }
  Object.assign(environment, {
    apiBaseUrl: cfg.apiBaseUrl.replace(/\/+$/, ''),
    keycloak: { issuer, clientId },
    defaultLocation: loc,
  } satisfies Environment);
}
