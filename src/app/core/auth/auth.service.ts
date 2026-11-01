import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { codeChallenge, jwtClaims, randomVerifier } from './pkce';

interface Tokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  /** epoch ms */
  expiresAt: number;
}

interface PendingLogin {
  verifier: string;
  state: string;
  returnTo: string;
}

const TOKENS_KEY = 'mc.auth';
const PENDING_KEY = 'mc.auth.pending';

/**
 * Keycloak login with Authorization Code + PKCE (public client "marketchat-app", no secret in the browser).
 * Tokens live in sessionStorage: they survive the Stripe redirect in the same tab and disappear with it.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = `${environment.keycloak.issuer}/protocol/openid-connect`;
  private readonly tokens = signal<Tokens | null>(readTokens());
  private refreshing: Promise<boolean> | null = null;

  readonly loggedIn = computed(() => this.tokens() !== null);
  readonly user = computed(() => {
    const t = this.tokens();
    if (!t) return null;
    const c = jwtClaims(t.idToken ?? t.accessToken);
    const email = (c['email'] as string) ?? '';
    const name = (c['given_name'] as string) ?? (c['name'] as string) ?? email.split('@')[0];
    return { email, name, initial: (name || email || '?').charAt(0).toUpperCase() };
  });

  get redirectUri(): string {
    return `${location.origin}/auth/callback`;
  }

  /** Sends the browser to the Keycloak login page; comes back to {@link handleCallback}. */
  async login(returnTo: string = location.pathname + location.search, lang = 'fr'): Promise<void> {
    const verifier = randomVerifier();
    const state = randomVerifier(16);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, returnTo } satisfies PendingLogin));
    const params = new URLSearchParams({
      client_id: environment.keycloak.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      code_challenge: await codeChallenge(verifier),
      code_challenge_method: 'S256',
      ui_locales: lang,
    });
    location.assign(`${this.oidc}/auth?${params}`);
  }

  /** Exchanges the authorization code for tokens; returns where the user was going. */
  async handleCallback(query: URLSearchParams): Promise<string> {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as PendingLogin | null;
    sessionStorage.removeItem(PENDING_KEY);
    const error = query.get('error');
    if (error) throw new Error(error);
    if (!pending || query.get('state') !== pending.state) throw new Error('invalid_state');
    const code = query.get('code');
    if (!code) throw new Error('missing_code');
    await this.tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: environment.keycloak.clientId,
      code_verifier: pending.verifier,
    });
    return pending.returnTo || '/';
  }

  /** A non-expired access token (refreshed when it expires within 30 s), or null when logged out. */
  async validAccessToken(): Promise<string | null> {
    const t = this.tokens();
    if (!t) return null;
    if (t.expiresAt - Date.now() > 30_000) return t.accessToken;
    return (await this.refresh()) ? this.tokens()?.accessToken ?? null : null;
  }

  /** Refresh once even if many requests ask at the same time. */
  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => (this.refreshing = null));
    }
    return this.refreshing;
  }

  logout(): void {
    const idToken = this.tokens()?.idToken;
    this.clear();
    const params = new URLSearchParams({ client_id: environment.keycloak.clientId, post_logout_redirect_uri: `${location.origin}/` });
    if (idToken) params.set('id_token_hint', idToken);
    location.assign(`${this.oidc}/logout?${params}`);
  }

  clear(): void {
    sessionStorage.removeItem(TOKENS_KEY);
    this.tokens.set(null);
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.tokens()?.refreshToken;
    if (!refreshToken) {
      this.clear();
      return false;
    }
    try {
      await this.tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: environment.keycloak.clientId });
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  private async tokenRequest(form: Record<string, string>): Promise<void> {
    const res = await fetch(`${this.oidc}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form),
    });
    if (!res.ok) throw new Error(`token_endpoint_${res.status}`);
    const body = (await res.json()) as { access_token: string; refresh_token?: string; id_token?: string; expires_in: number };
    const tokens: Tokens = {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? this.tokens()?.refreshToken ?? null,
      idToken: body.id_token ?? this.tokens()?.idToken ?? null,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
    sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    this.tokens.set(tokens);
  }
}

function readTokens(): Tokens | null {
  try {
    return JSON.parse(sessionStorage.getItem(TOKENS_KEY) ?? 'null') as Tokens | null;
  } catch {
    return null;
  }
}
