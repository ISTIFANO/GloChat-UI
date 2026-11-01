import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AddressInput, CartOperation, CartView, OrderView, PaymentMethod, QuoteView, SavedAddress } from './contracts';
import { MarketApi } from './market-api';

/** Authenticated commerce API through the gateway: cart, checkout, orders (bearer added by the interceptor). */
@Injectable({ providedIn: 'root' })
export class ShopApi {
  private readonly http = inject(HttpClient);
  private readonly market = inject(MarketApi);
  private readonly base = `${environment.apiBaseUrl}/api`;

  cart(): Promise<CartView> {
    return this.market.call(this.http.get<CartView>(`${this.base}/cart`));
  }

  apply(operations: CartOperation[], expectedVersion?: number): Promise<CartView> {
    return this.market.call(this.http.post<CartView>(`${this.base}/cart/operations`, { expectedVersion, operations }));
  }

  setDelivery(address: AddressInput): Promise<CartView> {
    return this.market.call(this.http.put<CartView>(`${this.base}/cart/delivery`, { address }));
  }

  setDeliveryFromSaved(addressId: string): Promise<CartView> {
    return this.market.call(this.http.put<CartView>(`${this.base}/cart/delivery`, { addressId }));
  }

  setPaymentMethod(method: PaymentMethod): Promise<CartView> {
    return this.market.call(this.http.put<CartView>(`${this.base}/cart/payment-method`, { method }));
  }

  addresses(): Promise<SavedAddress[]> {
    return this.market.call(this.http.get<SavedAddress[]>(`${this.base}/cart/addresses`));
  }

  saveAddress(address: AddressInput): Promise<SavedAddress> {
    return this.market.call(this.http.post<SavedAddress>(`${this.base}/cart/addresses`, address));
  }

  deleteAddress(id: string): Promise<void> {
    return this.market.call(this.http.delete<void>(`${this.base}/cart/addresses/${id}`));
  }

  quote(): Promise<QuoteView> {
    return this.market.call(this.http.post<QuoteView>(`${this.base}/checkout/quote`, null));
  }

  confirm(quote: QuoteView, idempotencyKey: string): Promise<OrderView> {
    return this.market.call(this.http.post<OrderView>(`${this.base}/checkout/confirm`, {
      quoteId: quote.quoteId,
      confirmationToken: quote.confirmationToken,
      idempotencyKey,
    }));
  }

  orders(): Promise<OrderView[]> {
    return this.market.call(this.http.get<OrderView[]>(`${this.base}/orders`));
  }

  order(number: string): Promise<OrderView> {
    return this.market.call(this.http.get<OrderView>(`${this.base}/orders/${encodeURIComponent(number)}`));
  }

  cancel(number: string): Promise<OrderView> {
    return this.market.call(this.http.post<OrderView>(`${this.base}/orders/${encodeURIComponent(number)}/cancel`, null));
  }

  pay(number: string): Promise<OrderView> {
    return this.market.call(this.http.post<OrderView>(`${this.base}/orders/${encodeURIComponent(number)}/pay`, null));
  }

  refreshPayment(number: string): Promise<OrderView> {
    return this.market.call(this.http.post<OrderView>(`${this.base}/orders/${encodeURIComponent(number)}/payment/refresh`, null));
  }
}
