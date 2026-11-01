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

export type LoginProvider = 'google' | 'email';

interface PendingLogin {
  verifier: string;
  state: string;
  returnTo: string;
}

const TOKENS_KEY = 'mc.auth';
const PENDING_KEY = 'mc.auth.pending';

/**
 * Keycloak login with Authorization Code + PKCE (public client "marketchat-app", no secret in the browser),
 * in a popup so the customer stays on the shop (full-page redirect only as a fallback).
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

  get popupRedirectUri(): string {
    return `${location.origin}/auth/popup`;
  }

  /** Full-page login (fallback when popups are blocked); comes back to {@link handleCallback}. */
  async login(returnTo: string = location.pathname + location.search, lang = 'fr', provider?: LoginProvider): Promise<void> {
    location.assign(await this.authorizeUrl(this.redirectUri, returnTo, lang, provider));
  }

  /**
   * Login in a small popup: the customer never leaves the page they are on. With provider "google" Keycloak
   * jumps straight to Google (kc_idp_hint) instead of showing its own form; if the Google identity provider
   * isn't configured, Keycloak simply shows its form. Resolves true once signed in, false if closed/failed.
   * Falls back to a full-page login if the browser blocks the popup.
   */
  async loginWithPopup(lang = 'fr', provider?: LoginProvider): Promise<boolean> {
    const url = await this.authorizeUrl(this.popupRedirectUri, location.pathname + location.search, lang, provider);
    const w = 480, h = 680;
    const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(url, 'glochat-login', `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) {
      location.assign(url.replace(encodeURIComponent(this.popupRedirectUri), encodeURIComponent(this.redirectUri)));
      return false;
    }
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        clearInterval(watch);
        resolve(ok);
      };
      const onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; search?: string } | null;
        if (event.origin !== location.origin || data?.type !== 'glochat-auth') return;
        this.exchange(new URLSearchParams(data.search ?? ''), this.popupRedirectUri)
          .then(() => finish(true))
          .catch(() => finish(false));
      };
      window.addEventListener('message', onMessage);
      // the user closed the popup without signing in (grace period: the message may still be on its way)
      const watch = setInterval(() => {
        if (popup.closed) setTimeout(() => finish(this.loggedIn()), 600);
      }, 400);
    });
  }

  /** Exchanges the authorization code for tokens; returns where the user was going. */
  async handleCallback(query: URLSearchParams, redirectUri = this.redirectUri): Promise<string> {
    return this.exchange(query, redirectUri);
  }

  private async authorizeUrl(redirectUri: string, returnTo: string, lang: string, provider?: LoginProvider): Promise<string> {
    const verifier = randomVerifier();
    const state = randomVerifier(16);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, returnTo } satisfies PendingLogin));
    const params = new URLSearchParams({
      client_id: environment.keycloak.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      code_challenge: await codeChallenge(verifier),
      code_challenge_method: 'S256',
      ui_locales: lang,
    });
    if (provider === 'google') params.set('kc_idp_hint', 'google');
    return `${this.oidc}/auth?${params}`;
  }

  private async exchange(query: URLSearchParams, redirectUri: string): Promise<string> {
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
      redirect_uri: redirectUri,
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
