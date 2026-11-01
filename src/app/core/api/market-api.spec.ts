import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { ApiError } from './contracts';
import { MarketApi } from './market-api';

/** Checks the requests sent to the gateway (no fake data: only the HTTP contract is verified). */
describe('MarketApi', () => {
  let api: MarketApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(MarketApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('POSTs the search to the gateway with location and hints', async () => {
    const p = api.search({ query: 'burger', location: { lat: 33.99, lng: -6.85 }, maxPrice: 70, limit: 8 });
    const req = http.expectOne(`${environment.apiBaseUrl}/api/catalog/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ query: 'burger', location: { lat: 33.99, lng: -6.85 }, maxPrice: 70, limit: 8 });
    req.flush({ results: [] });
    await expect(p).resolves.toEqual([]);
    http.verify();
  });

  it('GETs a product with the delivery location as query params', async () => {
    const p = api.getProduct('p-double-smash', { lat: 1, lng: 2 });
    const req = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/api/catalog/products/p-double-smash`);
    expect(req.request.params.get('lat')).toBe('1');
    expect(req.request.params.get('lng')).toBe('2');
    req.flush({ product: {}, description: '', optionGroups: [] });
    await p;
    http.verify();
  });

  it('maps RFC 7807 problems to ApiError with the backend code', async () => {
    const p = api.getProduct('nope');
    http.expectOne(() => true).flush({ status: 404, code: 'PRODUCT_NOT_FOUND', detail: 'Unknown product nope' }, { status: 404, statusText: 'Not Found' });
    await expect(p).rejects.toMatchObject({ name: 'ApiError', code: 'PRODUCT_NOT_FOUND', status: 404 } satisfies Partial<ApiError>);
  });

  it('maps an unreachable gateway to NETWORK_ERROR', async () => {
    const p = api.search({ query: 'x', location: { lat: 0, lng: 0 } });
    http.expectOne(() => true).error(new ProgressEvent('error'), { status: 0 });
    await expect(p).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
