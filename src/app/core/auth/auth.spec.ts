import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { codeChallenge, jwtClaims, randomVerifier } from './pkce';

describe('PKCE', () => {
  it('computes the S256 challenge of the RFC 7636 test vector', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('generates url-safe, unique verifiers of a valid length', () => {
    const a = randomVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(randomVerifier()).not.toBe(a);
  });

  it('reads claims of a JWT (display only)', () => {
    const payload = btoa(JSON.stringify({ email: 'demo@marketchat.local', given_name: 'Salma' })).replace(/=+$/, '');
    expect(jwtClaims(`h.${payload}.s`)['given_name']).toBe('Salma');
    expect(jwtClaims('garbage')).toEqual({});
  });
});

describe('authInterceptor', () => {
  function setup(token: string | null) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { validAccessToken: async () => token, refresh: async () => false } },
      ],
    });
    return { http: TestBed.inject(HttpClient), ctrl: TestBed.inject(HttpTestingController) };
  }

  it('adds the bearer token to gateway API calls only', async () => {
    const { http, ctrl } = setup('tok-123');
    const ours = firstValueFrom(http.get(`${environment.apiBaseUrl}/api/cart`));
    const theirs = firstValueFrom(http.get('https://example.com/api/thing'));
    await Promise.resolve();
    await new Promise((r) => setTimeout(r));
    const ourReq = ctrl.expectOne(`${environment.apiBaseUrl}/api/cart`);
    expect(ourReq.request.headers.get('Authorization')).toBe('Bearer tok-123');
    const theirReq = ctrl.expectOne('https://example.com/api/thing');
    expect(theirReq.request.headers.has('Authorization')).toBe(false);
    ourReq.flush({});
    theirReq.flush({});
    await Promise.all([ours, theirs]);
  });

  it('sends no header when signed out', async () => {
    const { http, ctrl } = setup(null);
    const call = firstValueFrom(http.get(`${environment.apiBaseUrl}/api/catalog/search`));
    await new Promise((r) => setTimeout(r));
    const req = ctrl.expectOne(`${environment.apiBaseUrl}/api/catalog/search`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await call;
  });
});
