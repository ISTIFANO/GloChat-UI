import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError, ApiProblem, GeoLocation, MerchantPage, ProductCard, ProductDetail, SearchRequest, SearchResponse } from './contracts';

/**
 * Client of the MarketChat api-gateway. Every call goes through the gateway (never directly to a service);
 * catalog endpoints are public; cart/checkout/orders (ShopApi) get the Keycloak bearer from the auth interceptor.
 */
@Injectable({ providedIn: 'root' })
export class MarketApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async search(request: SearchRequest): Promise<ProductCard[]> {
    const res = await this.call(this.http.post<SearchResponse>(`${this.base}/api/catalog/search`, request));
    return res.results;
  }

  getProduct(productId: string, location?: GeoLocation): Promise<ProductDetail> {
    let params = new HttpParams();
    if (location) params = params.set('lat', location.lat).set('lng', location.lng);
    return this.call(this.http.get<ProductDetail>(`${this.base}/api/catalog/products/${encodeURIComponent(productId)}`, { params }));
  }

  getMerchant(merchantId: string, location?: GeoLocation): Promise<MerchantPage> {
    let params = new HttpParams();
    if (location) params = params.set('lat', location.lat).set('lng', location.lng);
    return this.call(this.http.get<MerchantPage>(`${this.base}/api/catalog/merchants/${encodeURIComponent(merchantId)}`, { params }));
  }

  /** Media paths returned by the API are relative to the gateway. */
  mediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return /^https?:\/\//.test(path) ? path : `${this.base}${path}`;
  }

  /** Maps HTTP failures to ApiError with the backend's stable code (shared with ShopApi). */
  async call<T>(request: import('rxjs').Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 0) throw new ApiError('NETWORK_ERROR', 0, 'Gateway unreachable');
        const problem = (e.error ?? {}) as ApiProblem;
        throw new ApiError(problem.code ?? `HTTP_${e.status}`, e.status, problem.detail, problem);
      }
      throw e;
    }
  }
}
