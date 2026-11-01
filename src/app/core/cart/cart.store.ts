import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiError, CartView, PaymentMethod, AddressInput } from '../api/contracts';
import { ShopApi } from '../api/shop-api';
import { AuthService } from '../auth/auth.service';
import { LoginPrompt } from '../auth/login-prompt.service';
import { I18n } from '../i18n/i18n.service';

export interface AddRequest {
  productId: string;
  quantity: number;
  optionValueIds: string[];
}

/** Outcome of an "add to cart" tap. */
export type AddResult =
  | { kind: 'added' }
  | { kind: 'login' }
  | { kind: 'conflict'; currentMerchant: string };

const PENDING_ADD = 'mc.pendingAdd';

/**
 * The customer's cart, always as returned by the backend (prices are never computed here).
 * Signed-out users who tap "Add" are sent to login; the add is replayed when they come back.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly api = inject(ShopApi);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18n);
  private readonly prompt = inject(LoginPrompt);

  readonly view = signal<CartView | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly count = computed(() => this.view()?.itemCount ?? 0);
  readonly isEmpty = computed(() => (this.view()?.lines.length ?? 0) === 0);

  constructor() {
    effect(() => {
      if (this.auth.loggedIn()) {
        void this.refresh();
      } else {
        this.view.set(null);
      }
    });
  }

  async refresh(): Promise<void> {
    if (!this.auth.loggedIn()) return;
    try {
      this.view.set(await this.api.cart());
    } catch (e) {
      this.fail(e);
    }
  }

  async add(req: AddRequest): Promise<AddResult> {
    if (!this.auth.loggedIn()) {
      // kept in case the browser blocks the popup and we fall back to a full-page login
      sessionStorage.setItem(PENDING_ADD, JSON.stringify(req));
      const signedIn = await this.prompt.ask('cart');
      if (!signedIn) return { kind: 'login' };
      sessionStorage.removeItem(PENDING_ADD);
    }
    try {
      await this.run(() => this.api.apply([{ op: 'ADD', ...req }]));
      return { kind: 'added' };
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CART_MERCHANT_CONFLICT') {
        return { kind: 'conflict', currentMerchant: this.view()?.merchant?.name ?? '' };
      }
      throw e;
    }
  }

  /** "Start a new cart": empty the cart and add, in one all-or-nothing batch. */
  replaceWith(req: AddRequest): Promise<void> {
    return this.run(() => this.api.apply([{ op: 'CLEAR' }, { op: 'ADD', ...req }]));
  }

  /** Replays an add that was interrupted by the login redirect. */
  async resumePendingAdd(): Promise<AddResult | null> {
    const raw = sessionStorage.getItem(PENDING_ADD);
    if (!raw || !this.auth.loggedIn()) return null;
    sessionStorage.removeItem(PENDING_ADD);
    return this.add(JSON.parse(raw) as AddRequest);
  }

  setQuantity(lineId: string, quantity: number): Promise<void> {
    return quantity < 1
      ? this.remove(lineId)
      : this.run(() => this.api.apply([{ op: 'UPDATE', lineId, quantity }], this.view()?.version));
  }

  remove(lineId: string): Promise<void> {
    return this.run(() => this.api.apply([{ op: 'REMOVE', lineId }], this.view()?.version));
  }

  clear(): Promise<void> {
    return this.run(() => this.api.apply([{ op: 'CLEAR' }]));
  }

  setDelivery(address: AddressInput): Promise<void> {
    return this.run(() => this.api.setDelivery(address));
  }

  setDeliveryFromSaved(id: string): Promise<void> {
    return this.run(() => this.api.setDeliveryFromSaved(id));
  }

  setPaymentMethod(method: PaymentMethod): Promise<void> {
    return this.run(() => this.api.setPaymentMethod(method));
  }

  private async run(call: () => Promise<CartView>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.view.set(await call());
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CART_VERSION_CONFLICT') {
        await this.refresh();   // someone (another tab, the agent) changed the cart: show the truth
      }
      this.fail(e);
      throw e;
    } finally {
      this.busy.set(false);
    }
  }

  private fail(e: unknown): void {
    this.error.set(e instanceof ApiError && e.code === 'NETWORK_ERROR'
      ? this.i18n.t('error.network')
      : this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
  }
}
