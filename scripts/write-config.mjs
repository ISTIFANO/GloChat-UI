// Writes public/config.json (the web app's runtime config) from environment variables.
// Values come from the process environment, then from ./.env (git-ignored, see .env.example).
// Usage: node scripts/write-config.mjs [output-file]      (npm start / npm run build call it)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(root, 'public', 'config.json');

const fileEnv = {};
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const raw of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    fileEnv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const get = (key) => process.env[key] ?? fileEnv[key];
const missing = [];
const required = (key) => {
  const v = get(key);
  if (v === undefined || v === '') missing.push(key);
  return v ?? '';
};
const number = (key) => {
  const v = Number(required(key));
  if (!Number.isFinite(v)) missing.push(`${key} (number)`);
  return v;
};

const config = {
  // may be empty: the gateway is then served on the same origin as the web app
  apiBaseUrl: get('API_BASE_URL') ?? '',
  keycloak: { issuer: required('KEYCLOAK_ISSUER'), clientId: required('KEYCLOAK_CLIENT_ID') },
  defaultLocation: {
    label: required('DEFAULT_LOCATION_LABEL'),
    lat: number('DEFAULT_LOCATION_LAT'),
    lng: number('DEFAULT_LOCATION_LNG'),
  },
};

if (get('API_BASE_URL') === undefined) missing.push('API_BASE_URL (set it empty for same-origin)');
if (missing.length) {
  console.error(`write-config: missing ${missing.join(', ')} — copy .env.example to .env or set them in the environment`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify(config, null, 2) + '\n');
console.log(`write-config: ${out}`);
