import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { CartView } from '../api/contracts';
import { AuthService } from '../auth/auth.service';
import { LoginPrompt } from '../auth/login-prompt.service';
import { CartStore } from './cart.store';
import { CheckoutStore } from './checkout.store';

const CART = `${environment.apiBaseUrl}/api/cart`;
const view = (over: Partial<CartView> = {}): CartView => ({
  cartId: 'c1', version: 1, currency: 'MAD', merchant: { id: 'm-smash', name: 'Smash Lab Agdal', emoji: '🍔', logoUrl: null, open: true },
  lines: [], itemCount: 0, subtotal: 0, delivery: null, minimumOrder: 40, total: 0, paymentMethod: null,
  acceptedPaymentMethods: ['CASH', 'CARD'], issues: [], ...over,
});

describe('CartStore', () => {
  const loggedIn = signal(true);
  const login = vi.fn(async () => undefined);
  const ask = vi.fn(async () => false);
  let ctrl: HttpTestingController;
  let store: CartStore;

  beforeEach(() => {
    sessionStorage.clear();
    loggedIn.set(true);
    login.mockClear();
    ask.mockReset();
    ask.mockResolvedValue(false);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { loggedIn, login, validAccessToken: async () => 't' } },
        { provide: LoginPrompt, useValue: { ask } }],
    });
    ctrl = TestBed.inject(HttpTestingController);
    store = TestBed.inject(CartStore);
    TestBed.tick();
    ctrl.expectOne(CART).flush(view());   // initial load when logged in
  });

  it('adds through the backend and exposes its re-priced view', async () => {
    const result = store.add({ productId: 'p-double-smash', quantity: 2, optionValueIds: ['p-double-smash-size-m'] });
    const req = ctrl.expectOne(`${CART}/operations`);
    expect(req.request.body.operations).toEqual([{ op: 'ADD', productId: 'p-double-smash', quantity: 2, optionValueIds: ['p-double-smash-size-m'] }]);
    req.flush(view({ itemCount: 2, subtotal: 130, total: 130 }));
    expect(await result).toEqual({ kind: 'added' });
    expect(store.count()).toBe(2);
  });

  it('reports a merchant conflict instead of failing', async () => {
    const result = store.add({ productId: 'p-california', quantity: 1, optionValueIds: [] });
    ctrl.expectOne(`${CART}/operations`).flush({ code: 'CART_MERCHANT_CONFLICT', status: 409 }, { status: 409, statusText: 'Conflict' });
    expect(await result).toEqual({ kind: 'conflict', currentMerchant: 'Smash Lab Agdal' });
  });

  it('starting a new cart clears and adds in one batch', async () => {
    const done = store.replaceWith({ productId: 'p-california', quantity: 1, optionValueIds: [] });
    const req = ctrl.expectOne(`${CART}/operations`);
    expect(req.request.body.operations.map((o: { op: string }) => o.op)).toEqual(['CLEAR', 'ADD']);
    req.flush(view({ itemCount: 1 }));
    await done;
  });

  it('signed out: asks to sign in on the page, then adds without leaving it', async () => {
    loggedIn.set(false);
    ask.mockImplementation(async () => {
      loggedIn.set(true);   // the popup login succeeded
      return true;
    });
    const result = store.add({ productId: 'p-fries', quantity: 1, optionValueIds: [] });
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    ctrl.match(CART).forEach((r) => r.flush(view()));   // cart reload triggered by the login
    const req = ctrl.expectOne(`${CART}/operations`);
    expect(req.request.body.operations[0].productId).toBe('p-fries');
    req.flush(view({ itemCount: 1 }));
    expect(await result).toEqual({ kind: 'added' });
    expect(ask).toHaveBeenCalledWith('cart');
    expect(login).not.toHaveBeenCalled();                  // no page redirect
    expect(sessionStorage.getItem('mc.pendingAdd')).toBeNull();
  });

  it('signed out and the customer says "later": nothing is added', async () => {
    loggedIn.set(false);
    expect(await store.add({ productId: 'p-fries', quantity: 1, optionValueIds: [] })).toEqual({ kind: 'login' });
    ctrl.expectNone(`${CART}/operations`);
  });

  it('replays an add interrupted by a full-page login (popup blocked)', async () => {
    sessionStorage.setItem('mc.pendingAdd', JSON.stringify({ productId: 'p-coke', quantity: 1, optionValueIds: [] }));
    const replay = store.resumePendingAdd();
    const req = ctrl.expectOne(`${CART}/operations`);
    expect(req.request.body.operations[0].productId).toBe('p-coke');
    req.flush(view({ itemCount: 1 }));
    expect(await replay).toEqual({ kind: 'added' });
  });
});

describe('CheckoutStore', () => {
  it('keeps one idempotency key per quote, across reloads', () => {
    sessionStorage.clear();
    const store = new CheckoutStore();
    store.start({ quoteId: 'q1' } as never);
    const key = store.idempotencyKey;
    expect(new CheckoutStore().idempotencyKey).toBe(key);   // a reload reuses it: no second order
    store.start({ quoteId: 'q2' } as never);
    expect(store.idempotencyKey).not.toBe(key);            // a new quote gets a new key
    store.done();
    expect(new CheckoutStore().quote()).toBeNull();
  });
});
