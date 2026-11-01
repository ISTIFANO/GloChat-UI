import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, CartIssue, CartLine, PaymentMethod, SavedAddress } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { ShopApi } from '../../core/api/shop-api';
import { AuthService } from '../../core/auth/auth.service';
import { AREAS } from '../../core/cart/areas';
import { CartStore } from '../../core/cart/cart.store';
import { CheckoutStore } from '../../core/cart/checkout.store';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../../shared/motion/motion.service';
import { FoodImageComponent } from '../../shared/ui/food-image.component';

/** Cart: lines re-priced by the backend, delivery address, payment method, and every checkout blocker explained. */
@Component({
  selector: 'mc-cart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, FoodImageComponent],
  template: `
    <div #root class="px-5 pb-40 pt-2">
      <div class="flex items-center justify-between">
        <h1 data-reveal class="text-[1.7rem] font-extrabold tracking-tight">{{ i18n.t('cart.title') }}</h1>
        @if (!cart.isEmpty()) {
          <button type="button" class="text-sm font-semibold text-muted underline-offset-4 hover:underline" (click)="cart.clear()">
            {{ i18n.t('cart.clear') }}
          </button>
        }
      </div>

      @if (!auth.loggedIn()) {
        <div class="mt-16 flex flex-col items-center gap-4 text-center">
          <span class="grid size-20 place-items-center rounded-[1.6rem] bg-iris-50 text-4xl" aria-hidden="true">🛒</span>
          <p class="text-lg font-bold">{{ i18n.t('cart.loginTitle') }}</p>
          <button type="button" class="btn-primary" (click)="login()">{{ i18n.t('header.login') }}</button>
        </div>
      } @else if (cart.view(); as v) {
        @if (v.lines.length === 0) {
          <div data-reveal class="mt-16 flex flex-col items-center gap-3 text-center">
            <span class="grid size-24 place-items-center rounded-[1.8rem] bg-gradient-to-br from-iris-100 to-zest-300/60 text-5xl" aria-hidden="true">🛍️</span>
            <p class="text-lg font-extrabold">{{ i18n.t('cart.empty.title') }}</p>
            <p class="max-w-xs text-sm text-muted">{{ i18n.t('cart.empty.text') }}</p>
            <a routerLink="/" class="btn-primary mt-2">{{ i18n.t('cart.browse') }}</a>
          </div>
        } @else {
          <!-- merchant -->
          @if (v.merchant; as m) {
            <a data-reveal [routerLink]="['/m', m.id]" class="mt-3 flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line/70">
              @if (market.mediaUrl(m.logoUrl); as logo) {
                <img [src]="logo" [alt]="m.name" class="size-11 rounded-xl" />
              } @else {
                <span class="grid size-11 place-items-center rounded-xl bg-iris-50 text-2xl">{{ m.emoji }}</span>
              }
              <div class="min-w-0 flex-1">
                <p class="truncate font-bold">{{ m.name }}</p>
                <p class="text-xs font-semibold" [class]="m.open ? 'text-success' : 'text-ember-500'">
                  {{ m.open ? i18n.t('merchant.open') : i18n.t('merchant.closed') }}
                </p>
              </div>
              <span class="text-sm font-semibold text-iris-600">{{ i18n.t('cart.addMore') }}</span>
            </a>
          }

          <!-- lines -->
          <ul data-reveal class="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-line/70">
            @for (line of v.lines; track line.lineId) {
              <li class="flex gap-3 p-3" [class.opacity-55]="!line.available" data-cart-line>
                <mc-food-image class="size-[4.5rem] shrink-0 rounded-2xl" [path]="line.imageUrl"
                               [visual]="{ emoji: line.emoji ?? '🍽️', from: '#efeaff', to: '#c9bcff' }" [alt]="line.name ?? ''" emojiSize="2rem" />
                <div class="flex min-w-0 flex-1 flex-col">
                  <div class="flex items-start justify-between gap-2">
                    <p dir="auto" class="font-bold leading-snug">{{ line.name ?? i18n.t('cart.unavailable') }}</p>
                    <p class="shrink-0 font-extrabold" dir="ltr">{{ i18n.price(line.lineTotal) }}</p>
                  </div>
                  @if (selectionText(line); as sel) {
                    <p dir="auto" class="mt-0.5 line-clamp-2 text-xs text-muted">{{ sel }}</p>
                  }
                  @if (!line.available) {
                    <span class="mt-1 w-fit rounded-full bg-ember-500/10 px-2 py-0.5 text-[0.7rem] font-bold text-ember-500">{{ i18n.t('cart.unavailable') }}</span>
                  }
                  <div class="mt-auto flex items-center justify-between pt-2">
                    <div class="flex items-center gap-1 rounded-full bg-canvas p-1 ring-1 ring-line">
                      <button type="button" class="grid size-7 place-items-center rounded-full bg-surface text-lg font-bold shadow-sm transition active:scale-90"
                              [attr.aria-label]="line.quantity === 1 ? i18n.t('cart.remove') : '-'" [disabled]="cart.busy()"
                              (click)="step(line, -1, $event)">
                        @if (line.quantity === 1) {
                          <svg viewBox="0 0 20 20" class="size-3.5 text-ember-500" aria-hidden="true"><path fill="currentColor" d="M7 2h6l1 2h4v2H2V4h4l1-2Zm-3 6h12l-1 10H5L4 8Z"/></svg>
                        } @else { − }
                      </button>
                      <span class="w-6 text-center text-sm font-extrabold" aria-live="polite">{{ line.quantity }}</span>
                      <button type="button" class="grid size-7 place-items-center rounded-full bg-surface text-lg font-bold shadow-sm transition active:scale-90"
                              aria-label="+" [disabled]="cart.busy() || line.quantity >= 50 || !line.available" (click)="step(line, 1, $event)">+</button>
                    </div>
                    <span class="text-xs text-muted" dir="ltr">{{ i18n.price(line.unitPrice) }} × {{ line.quantity }}</span>
                  </div>
                </div>
              </li>
            }
          </ul>

          <!-- delivery -->
          <section data-reveal class="mt-6">
            <h2 class="mb-2 text-lg font-extrabold">{{ i18n.t('cart.delivery') }}</h2>
            @if (v.delivery && !editingAddress()) {
              <div class="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line/70">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-zest-300 text-lg" aria-hidden="true">📍</span>
                <div class="min-w-0 flex-1">
                  <p class="font-bold">{{ v.delivery.label }}</p>
                  <p dir="auto" class="truncate text-xs text-muted">{{ v.delivery.line }}, {{ v.delivery.city }}</p>
                  @if (v.delivery.inZone === false) {
                    <p class="text-xs font-bold text-ember-500">{{ i18n.t('cart.outOfZone') }}</p>
                  } @else if (v.delivery.etaText) {
                    <p class="text-xs font-semibold text-iris-600" dir="ltr">🛵 {{ v.delivery.etaText }} · {{ v.delivery.distanceKm }} km</p>
                  }
                </div>
                <button type="button" class="chip !py-1.5 !text-xs" (click)="editingAddress.set(true)">{{ i18n.t('cart.change') }}</button>
              </div>
            } @else {
              <div class="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-line/70">
                <p class="font-bold">{{ i18n.t('cart.chooseAddress') }}</p>
                @if (saved().length) {
                  <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">{{ i18n.t('cart.saved') }}</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    @for (a of saved(); track a.id) {
                      <button type="button" class="chip" (click)="useSaved(a)">📍 {{ a.label }} <span class="text-muted">· {{ a.line }}</span></button>
                    }
                  </div>
                }
                <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{{ i18n.t('cart.newAddress') }}</p>
                <div class="mt-2 grid gap-2">
                  <input class="field" name="label" [(ngModel)]="form.label" [placeholder]="i18n.t('cart.addressLabel')" maxlength="60" />
                  <input class="field" name="line" [(ngModel)]="form.line" [placeholder]="i18n.t('cart.addressLine')" maxlength="200" />
                  <label class="text-xs font-semibold text-muted" for="area">{{ i18n.t('cart.area') }}</label>
                  <div id="area" class="flex flex-wrap gap-2" role="radiogroup">
                    @for (area of areas; track area.id) {
                      <button type="button" role="radio" class="chip !py-1.5" [attr.aria-checked]="form.areaId === area.id"
                              [class.!bg-ink]="form.areaId === area.id" [class.!text-white]="form.areaId === area.id"
                              (click)="form.areaId = area.id">{{ area.name }} <span class="opacity-60">{{ area.city }}</span></button>
                    }
                  </div>
                  <button type="button" class="btn-primary mt-1" [disabled]="!form.line.trim() || cart.busy()" (click)="saveAddress()">
                    {{ i18n.t('cart.saveAddress') }}
                  </button>
                </div>
              </div>
            }
          </section>

          <!-- payment -->
          <section data-reveal class="mt-6">
            <h2 class="mb-2 text-lg font-extrabold">{{ i18n.t('cart.payment') }}</h2>
            <div class="grid grid-cols-2 gap-2" role="radiogroup">
              @for (pm of paymentOptions; track pm.method) {
                @let accepted = v.acceptedPaymentMethods.includes(pm.method);
                <button type="button" role="radio" [attr.aria-checked]="v.paymentMethod === pm.method" [disabled]="!accepted || cart.busy()"
                        class="flex flex-col items-start gap-1 rounded-2xl bg-surface p-3 text-start shadow-soft ring-2 transition disabled:opacity-50"
                        [class]="v.paymentMethod === pm.method ? 'ring-iris-500 bg-iris-50/60' : 'ring-line/70'"
                        (click)="pay(pm.method, $event)">
                  <span class="text-2xl" aria-hidden="true">{{ pm.icon }}</span>
                  <span class="text-sm font-bold">{{ i18n.t(pm.label) }}</span>
                  <span class="text-[0.7rem] text-muted">{{ accepted ? i18n.t(pm.note) : i18n.t('cart.notAccepted') }}</span>
                </button>
              }
            </div>
          </section>

          <!-- issues -->
          @if (visibleIssues(v.issues).length) {
            <ul data-reveal class="mt-5 space-y-2" aria-live="polite">
              @for (issue of visibleIssues(v.issues); track issue.code + issue.lineId) {
                <li class="flex items-start gap-2 rounded-2xl bg-ember-500/10 px-3 py-2.5 text-sm font-semibold text-ember-500">
                  <span aria-hidden="true">⚠️</span>
                  <span>{{ i18n.t('issue.' + issue.code, { missing: issue.missing != null ? i18n.price(issue.missing) : '' }) }}</span>
                </li>
              }
            </ul>
          }

          <!-- totals -->
          <dl data-reveal class="mt-6 space-y-1.5 rounded-2xl bg-surface p-4 text-sm shadow-soft ring-1 ring-line/70">
            <div class="flex justify-between"><dt class="text-muted">{{ i18n.t('cart.subtotal') }}</dt><dd dir="ltr" class="font-semibold">{{ i18n.price(v.subtotal) }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted">{{ i18n.t('cart.fee') }}</dt>
              <dd dir="ltr" class="font-semibold">{{ v.delivery?.fee != null ? i18n.price(v.delivery!.fee!) : '—' }}</dd></div>
            <div class="flex justify-between border-t border-line pt-2 text-base"><dt class="font-extrabold">{{ i18n.t('cart.total') }}</dt>
              <dd dir="ltr" class="font-extrabold">{{ i18n.price(v.total) }}</dd></div>
          </dl>

          @if (error()) {
            <p class="mt-3 text-center text-sm font-semibold text-ember-500" role="alert">{{ error() }}</p>
          }

          <div class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] bg-gradient-to-t from-canvas via-canvas to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
            <button #cta type="button" class="btn-primary w-full text-base" [disabled]="!v.issues.length ? quoting() : true"
                    (click)="checkout()">
              @if (quoting()) {
                <span class="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
              } @else {
                <span dir="ltr">{{ i18n.t('cart.checkout', { price: i18n.price(v.total) }) }}</span>
              }
            </button>
          </div>
        }
      } @else {
        <div class="mt-6 space-y-3" aria-busy="true">
          <div class="h-16 animate-pulse rounded-2xl bg-line/60"></div>
          <div class="h-40 animate-pulse rounded-2xl bg-line/60"></div>
        </div>
      }
    </div>
  `,
})
export class CartPage {
  readonly i18n = inject(I18n);
  readonly auth = inject(AuthService);
  readonly cart = inject(CartStore);
  readonly market = inject(MarketApi);
  private readonly shop = inject(ShopApi);
  private readonly checkoutStore = inject(CheckoutStore);
  private readonly router = inject(Router);
  private readonly motion = inject(Motion);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly cta = viewChild<ElementRef<HTMLElement>>('cta');

  readonly areas = AREAS;
  readonly saved = signal<SavedAddress[]>([]);
  readonly editingAddress = signal(false);
  readonly quoting = signal(false);
  readonly error = signal<string | null>(null);
  form = { label: '', line: '', areaId: 'agdal' };

  readonly paymentOptions: { method: PaymentMethod; icon: string; label: string; note: string }[] = [
    { method: 'CASH', icon: '💵', label: 'cart.cash', note: 'cart.cashNote' },
    { method: 'CARD', icon: '💳', label: 'cart.card', note: 'cart.cardNote' },
  ];

  readonly hasLines = computed(() => (this.cart.view()?.lines.length ?? 0) > 0);

  constructor() {
    void this.cart.refresh();
    if (this.auth.loggedIn()) void this.loadAddresses();
    afterNextRender(() => {
      const root = this.root()?.nativeElement;
      if (root) this.motion.merchantIn(root);
    });
  }

  login(): void {
    void this.auth.login('/cart', this.i18n.lang());
  }

  selectionText(line: CartLine): string {
    const parts = line.selections.map((s) => s.label);
    if (line.note) parts.push(`« ${line.note} »`);
    return parts.join(' · ');
  }

  /** Address / payment blockers have their own sections; this lists the rest (or those, before they're set). */
  visibleIssues(issues: CartIssue[]): CartIssue[] {
    return issues.filter((i) => i.code !== 'CART_EMPTY');
  }

  async step(line: CartLine, delta: number, event: Event): Promise<void> {
    this.motion.pop(event.currentTarget as Element);
    await this.safe(() => this.cart.setQuantity(line.lineId, line.quantity + delta));
  }

  async pay(method: PaymentMethod, event: Event): Promise<void> {
    this.motion.pop(event.currentTarget as Element);
    await this.safe(() => this.cart.setPaymentMethod(method));
  }

  async useSaved(a: SavedAddress): Promise<void> {
    await this.safe(() => this.cart.setDeliveryFromSaved(a.id));
    this.editingAddress.set(false);
  }

  async saveAddress(): Promise<void> {
    const area = AREAS.find((a) => a.id === this.form.areaId) ?? AREAS[0];
    const address = {
      label: this.form.label.trim() || area.name,
      line: this.form.line.trim(),
      city: area.city,
      lat: area.lat,
      lng: area.lng,
    };
    await this.safe(async () => {
      const saved = await this.shop.saveAddress(address);
      this.saved.update((list) => [...list, saved]);
      await this.cart.setDeliveryFromSaved(saved.id);
    });
    this.form = { label: '', line: '', areaId: this.form.areaId };
    this.editingAddress.set(false);
  }

  async checkout(): Promise<void> {
    this.quoting.set(true);
    this.error.set(null);
    try {
      this.checkoutStore.start(await this.shop.quote());
      await this.router.navigateByUrl('/checkout');
    } catch (e) {
      this.motion.shake(this.cta()?.nativeElement ?? null);
      await this.cart.refresh();
      this.error.set(this.message(e));
    } finally {
      this.quoting.set(false);
    }
  }

  private async loadAddresses(): Promise<void> {
    try {
      this.saved.set(await this.shop.addresses());
    } catch {
      /* the cart still works without saved addresses */
    }
  }

  private async safe(action: () => Promise<void>): Promise<void> {
    this.error.set(null);
    try {
      await action();
    } catch (e) {
      this.error.set(this.message(e));
    }
  }

  private message(e: unknown): string {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') return this.i18n.t('error.network');
    if (e instanceof ApiError && e.code === 'CHECKOUT_NOT_READY') return '';   // the refreshed issues list explains it
    return this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' });
  }
}
