import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { IllustrationComponent } from '../../shared/ui/illustration.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { Router, RouterLink } from '@angular/router';
import { ApiError, QuoteView } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { ShopApi } from '../../core/api/shop-api';
import { CartStore } from '../../core/cart/cart.store';
import { CheckoutStore } from '../../core/cart/checkout.store';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../../shared/motion/motion.service';
import { FoodImageComponent } from '../../shared/ui/food-image.component';

/**
 * "Confirm & pay": the frozen quote. Confirming is the only way an order is created; card orders continue on
 * Stripe's hosted page. One idempotency key per quote, so a double tap can't create two orders.
 */
@Component({
  selector: 'mc-checkout-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IllustrationComponent, IconComponent, RouterLink, FoodImageComponent],
  template: `
    <div #root class="px-5 pb-44 pt-2">
      @if (quote(); as q) {
        <div class="flex items-center gap-3">
          <a routerLink="/cart" class="grid size-10 place-items-center rounded-full bg-surface shadow-soft ring-1 ring-line" [attr.aria-label]="i18n.t('merchant.back')">
            <svg viewBox="0 0 20 20" class="size-5 rtl:-scale-x-100" aria-hidden="true"><path fill="currentColor" d="M12.7 4.3 7 10l5.7 5.7-1.4 1.4L4.2 10l7.1-7.1z"/></svg>
          </a>
          <h1 class="text-[1.5rem] font-extrabold tracking-tight">{{ i18n.t('checkout.title') }}</h1>
        </div>

        <p data-reveal class="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
           [class]="secondsLeft() > 0 ? 'bg-zest-300 text-ink' : 'bg-ember-500/15 text-ember-500'" role="timer">
          <mc-icon name="clock" class="size-4" /> @if (secondsLeft() > 0) { {{ i18n.t('checkout.expires', { t: countdown() }) }} } @else { {{ i18n.t('checkout.expired') }} }
        </p>

        @if (banner()) {
          <p data-reveal class="mt-3 rounded-2xl bg-iris-50 px-4 py-3 text-sm font-semibold text-iris-700 ring-1 ring-iris-200" role="alert">{{ banner() }}</p>
        }

        <!-- merchant + lines -->
        <section data-reveal class="mt-4 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-line/70">
          <div class="flex items-center gap-3 border-b border-line p-3">
            @if (market.mediaUrl(q.merchant.logoUrl); as logo) {
              <img [src]="logo" [alt]="q.merchant.name" class="size-10 rounded-xl" />
            }
            <p class="font-bold">{{ q.merchant.name }}</p>
          </div>
          <ul class="divide-y divide-line">
            @for (l of q.lines; track $index) {
              <li class="flex items-center gap-3 p-3">
                <mc-food-image class="size-12 shrink-0 rounded-xl" [path]="l.imageUrl" [visual]="{ emoji: '', from: '#efeaff', to: '#c9bcff' }" emojiSize="1.5rem" />
                <div class="min-w-0 flex-1">
                  <p dir="auto" class="truncate text-sm font-bold"><span class="text-iris-600">{{ l.quantity }}×</span> {{ l.name }}</p>
                  @if (l.selections.length) {
                    <p dir="auto" class="truncate text-xs text-muted">{{ selectionText(l.selections) }}</p>
                  }
                </div>
                <p class="shrink-0 text-sm font-bold" dir="ltr">{{ i18n.price(l.lineTotal) }}</p>
              </li>
            }
          </ul>
        </section>

        <!-- delivery + payment -->
        <section data-reveal class="mt-4 grid gap-2">
          <div class="flex min-w-0 items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line/70">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-zest-300 text-ink" aria-hidden="true"><mc-icon name="pin" class="size-5" /></span>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted">{{ i18n.t('checkout.deliverTo') }}</p>
              <p dir="auto" class="truncate text-sm font-bold">{{ q.delivery.label }} · {{ q.delivery.line }}, {{ q.delivery.city }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="min-w-0 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line/70">
              <p class="text-xs text-muted">{{ i18n.t('checkout.eta') }}</p>
              <p class="flex items-center gap-1.5 text-sm font-bold" dir="ltr"><mc-icon name="scooter" class="size-[1.1rem] text-iris-500" /> {{ q.delivery.etaText }}</p>
            </div>
            <div class="min-w-0 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line/70">
              <p class="text-xs text-muted">{{ i18n.t('cart.payment') }}</p>
              <p class="flex min-w-0 items-center gap-1.5 text-sm font-bold"><mc-icon [name]="q.paymentMethod === 'CARD' ? 'card' : 'cash'" class="size-[1.1rem] text-iris-500" /><span class="truncate">{{ q.paymentMethod === 'CARD' ? i18n.t('cart.card') : i18n.t('cart.cash') }}</span></p>
            </div>
          </div>
        </section>

        <dl data-reveal class="mt-4 space-y-1.5 rounded-2xl bg-surface p-4 text-sm shadow-soft ring-1 ring-line/70">
          <div class="flex justify-between"><dt class="text-muted">{{ i18n.t('cart.subtotal') }}</dt><dd dir="ltr">{{ i18n.price(q.subtotal) }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">{{ i18n.t('cart.fee') }}</dt><dd dir="ltr">{{ i18n.price(q.deliveryFee) }}</dd></div>
          <div class="flex items-baseline justify-between border-t border-line pt-2">
            <dt class="text-base font-extrabold">{{ i18n.t('cart.total') }}</dt>
            <dd #total class="text-2xl font-extrabold tracking-tight" dir="ltr">{{ i18n.price(q.total) }}</dd>
          </div>
        </dl>

        <div class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] bg-gradient-to-t from-canvas via-canvas to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
          @if (secondsLeft() > 0) {
            <button #cta type="button" class="btn-primary w-full text-base" [disabled]="busy()" (click)="confirm()">
              @if (busy()) {
                <span class="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
                @if (redirecting()) { {{ i18n.t('checkout.redirecting') }} }
              } @else {
                <span dir="ltr">{{ q.paymentMethod === 'CARD' ? i18n.t('checkout.confirmCard', { price: i18n.price(q.total) })
                                                            : i18n.t('checkout.confirmCash', { price: i18n.price(q.total) }) }}</span>
              }
            </button>
          } @else {
            <button type="button" class="btn-primary w-full text-base" [disabled]="busy()" (click)="requote()">{{ i18n.t('checkout.refresh') }}</button>
          }
          <p class="mt-2 text-center text-[0.7rem] text-muted">{{ i18n.t('checkout.legal') }}</p>
        </div>
      } @else {
        <div class="flex flex-col items-center gap-3 py-24 text-center">
          <mc-illustration name="receipt" class="size-36" />
          <p class="font-semibold">{{ i18n.t('checkout.noQuote') }}</p>
          <a routerLink="/cart" class="btn-ghost">{{ i18n.t('cart.title') }}</a>
        </div>
      }
    </div>
  `,
})
export class CheckoutPage {
  readonly i18n = inject(I18n);
  readonly market = inject(MarketApi);
  private readonly shop = inject(ShopApi);
  private readonly store = inject(CheckoutStore);
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);
  private readonly motion = inject(Motion);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly cta = viewChild<ElementRef<HTMLElement>>('cta');
  private readonly totalEl = viewChild<ElementRef<HTMLElement>>('total');

  readonly quote = this.store.quote;
  readonly busy = signal(false);
  readonly redirecting = signal(false);
  readonly banner = signal<string | null>(null);
  private readonly now = signal(Date.now());

  readonly secondsLeft = computed(() => {
    const q = this.quote();
    return q ? Math.max(0, Math.floor((Date.parse(q.expiresAt) - this.now()) / 1000)) : 0;
  });
  readonly countdown = computed(() => {
    const s = this.secondsLeft();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    afterNextRender(() => {
      const root = this.root()?.nativeElement;
      if (root) this.motion.merchantIn(root);
    });
  }

  selectionText(selections: { label: string }[]): string {
    return selections.map((s) => s.label).join(' · ');
  }

  async confirm(): Promise<void> {
    const q = this.quote();
    if (!q || this.busy()) return;
    this.busy.set(true);
    this.banner.set(null);
    try {
      const order = await this.shop.confirm(q, this.store.idempotencyKey);
      this.store.done();
      void this.cart.refresh();
      if (order.paymentUrl) {
        this.redirecting.set(true);
        location.assign(order.paymentUrl);   // Stripe-hosted page: card data never touches our servers
        return;
      }
      await this.router.navigate(['/orders', order.number], { queryParams: { placed: 1 } });
    } catch (e) {
      await this.handle(e);
    } finally {
      if (!this.redirecting()) this.busy.set(false);
    }
  }

  async requote(): Promise<void> {
    this.busy.set(true);
    try {
      this.store.start(await this.shop.quote());
      this.banner.set(null);
    } catch {
      await this.router.navigateByUrl('/cart');
    } finally {
      this.busy.set(false);
    }
  }

  private async handle(e: unknown): Promise<void> {
    if (!(e instanceof ApiError)) throw e;
    switch (e.code) {
      case 'PRICE_CHANGED': {
        const fresh = e.problem?.['quote'] as QuoteView;
        this.store.start(fresh);
        this.banner.set(this.i18n.t('checkout.priceChanged', { price: this.i18n.price(fresh.total) }));
        this.motion.pop(this.totalEl()?.nativeElement ?? null);
        return;
      }
      case 'QUOTE_STALE':
      case 'QUOTE_INVALIDATED':
      case 'QUOTE_EXPIRED':
        this.banner.set(this.i18n.t('checkout.stale'));
        await this.requote();
        return;
      case 'CHECKOUT_NOT_READY':
      case 'CART_EMPTY':
        this.store.done();
        await this.router.navigateByUrl('/cart');
        return;
      default:
        this.motion.shake(this.cta()?.nativeElement ?? null);
        this.banner.set(e.code === 'NETWORK_ERROR' ? this.i18n.t('error.network') : this.i18n.t('error.generic', { code: e.code }));
    }
  }
}
