import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, input,
  signal, viewChild,
} from '@angular/core';
import { IllustrationComponent } from '../../shared/ui/illustration.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { RouterLink } from '@angular/router';
import { ApiError, OrderStatus, OrderView } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { ShopApi } from '../../core/api/shop-api';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../../shared/motion/motion.service';
import { FoodImageComponent } from '../../shared/ui/food-image.component';

const STEPS: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'ON_THE_WAY', 'DELIVERED'];
const ICON: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'card', PLACED: 'check-circle', ACCEPTED: 'chef', PREPARING: 'flame', ON_THE_WAY: 'scooter', DELIVERED: 'home-check', CANCELED: 'x-circle',
};

/**
 * One order. Back from Stripe (?payment=success) it asks the backend to verify the payment with Stripe
 * (server-to-server) and polls a few seconds: the browser redirect alone is never trusted.
 */
@Component({
  selector: 'mc-order-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IllustrationComponent, IconComponent, RouterLink, FoodImageComponent],
  template: `
    <div #root class="px-5 pb-28 pt-2">
      @if (order(); as o) {
        <a routerLink="/orders" class="text-sm font-semibold text-muted hover:text-iris-600">← {{ i18n.t('orders.title') }}</a>

        <!-- status hero -->
        <section data-reveal class="relative mt-3 overflow-hidden rounded-[1.75rem] p-5 text-white shadow-lift"
                 [class]="o.status === 'CANCELED' ? 'bg-ink' : o.status === 'AWAITING_PAYMENT' ? 'bg-gradient-to-br from-ink to-iris-700' : 'bg-gradient-to-br from-iris-500 to-iris-700'">
          <div class="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-white/10"></div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-white/70" dir="ltr">{{ i18n.t('order.number', { n: o.number }) }}</p>
              <h1 class="mt-1 text-[1.6rem] font-extrabold leading-tight" data-status>{{ i18n.t('order.status.' + o.status) }}</h1>
              <p class="mt-1 text-sm text-white/80">{{ i18n.t('order.sub.' + o.status) }}</p>
            </div>
            <span #badge class="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur" aria-hidden="true"><mc-icon [name]="icon(o.status)" class="size-8" [stroke]="1.7" /></span>
          </div>
          @if (o.status !== 'CANCELED' && o.status !== 'AWAITING_PAYMENT') {
            <p class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zest-300 px-3 py-1 text-xs font-bold text-ink"><mc-icon name="scooter" class="size-4" /> {{ i18n.t('checkout.eta') }} : <bdi dir="ltr">{{ o.etaText }}</bdi></p>
          }
        </section>

        @if (verifying()) {
          <p class="mt-3 flex items-center gap-2 rounded-2xl bg-iris-50 px-4 py-3 text-sm font-semibold text-iris-700" role="status">
            <span class="size-4 animate-spin rounded-full border-2 border-iris-200 border-t-iris-500" aria-hidden="true"></span>
            {{ i18n.t('order.verifying') }}
          </p>
        } @else if (paymentNotice()) {
          <p class="mt-3 rounded-2xl bg-ember-500/10 px-4 py-3 text-sm font-semibold text-ember-500" role="alert">{{ paymentNotice() }}</p>
        }

        @if (o.status === 'AWAITING_PAYMENT') {
          <button type="button" class="btn-primary mt-4 w-full text-base" [disabled]="busy()" (click)="payNow()">
            <mc-icon name="card" class="size-5" /> <span dir="ltr">{{ i18n.t('order.pay', { price: i18n.price(o.total) }) }}</span>
          </button>
        }

        <!-- progress -->
        @if (o.status !== 'CANCELED' && o.status !== 'AWAITING_PAYMENT') {
          <ol data-reveal class="mt-5 flex items-start justify-between gap-1" [attr.aria-label]="i18n.t('order.status.' + o.status)">
            @for (s of steps; track s; let i = $index) {
              <li class="flex flex-1 flex-col items-center gap-1.5 text-center">
                <span class="grid size-8 place-items-center rounded-full text-xs font-extrabold transition"
                      [class]="i <= stepIndex() ? 'bg-iris-500 text-white shadow-glow' : 'bg-line text-muted'"
                      [attr.aria-current]="i === stepIndex() ? 'step' : null">@if (i < stepIndex()) { <mc-icon name="check" class="size-4" [stroke]="2.6" /> } @else { {{ i + 1 }} }</span>
                <span class="text-[0.65rem] font-semibold leading-tight" [class]="i <= stepIndex() ? 'text-ink' : 'text-muted'">{{ i18n.t('order.step.' + s) }}</span>
              </li>
            }
          </ol>
        }

        <!-- items -->
        <section data-reveal class="mt-6 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-line/70">
          <div class="flex items-center gap-3 border-b border-line p-3">
            @if (market.mediaUrl(o.merchant.logoUrl); as logo) {
              <img [src]="logo" [alt]="o.merchant.name" class="size-10 rounded-xl" />
            }
            <div class="min-w-0 flex-1">
              <p class="font-bold">{{ o.merchant.name }}</p>
              <p class="text-xs text-muted">{{ i18n.t('order.items') }}</p>
            </div>
          </div>
          <ul class="divide-y divide-line">
            @for (l of o.lines; track $index) {
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
          <dl class="space-y-1 border-t border-line p-4 text-sm">
            <div class="flex justify-between"><dt class="text-muted">{{ i18n.t('cart.subtotal') }}</dt><dd dir="ltr">{{ i18n.price(o.subtotal) }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted">{{ i18n.t('cart.fee') }}</dt><dd dir="ltr">{{ i18n.price(o.deliveryFee) }}</dd></div>
            <div class="flex justify-between pt-1 text-base font-extrabold"><dt>{{ i18n.t('cart.total') }}</dt><dd dir="ltr">{{ i18n.price(o.total) }}</dd></div>
            <div class="flex justify-between pt-1 text-xs">
              <dt class="text-muted">{{ i18n.t('cart.payment') }}</dt>
              <dd class="flex items-center gap-1 font-semibold" [class.text-success]="o.paymentStatus === 'PAID'">
                <mc-icon [name]="o.paymentStatus === 'PAID' ? 'check' : o.paymentMethod === 'CASH' ? 'cash' : 'card'" class="size-4" />
                {{ o.paymentStatus === 'PAID' ? i18n.t('order.paid') : o.paymentMethod === 'CASH' ? i18n.t('order.cash') : i18n.t('cart.card') }}
              </dd>
            </div>
          </dl>
        </section>

        <div data-reveal class="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line/70">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-zest-300 text-ink" aria-hidden="true"><mc-icon name="pin" class="size-5" /></span>
          <p dir="auto" class="min-w-0 truncate text-sm"><span class="font-bold">{{ o.delivery.label }}</span> · {{ o.delivery.line }}, {{ o.delivery.city }}</p>
        </div>

        @if (o.cancellable) {
          @if (confirmCancel()) {
            <div class="mt-6 rounded-2xl bg-surface p-4 text-center shadow-soft ring-1 ring-line/70">
              <p class="font-bold">{{ i18n.t('order.cancelConfirm') }}</p>
              <div class="mt-3 flex justify-center gap-2">
                <button type="button" class="btn-ghost" (click)="confirmCancel.set(false)">{{ i18n.t('order.no') }}</button>
                <button type="button" class="btn-primary !bg-ember-500" [disabled]="busy()" (click)="cancel()">{{ i18n.t('order.yes') }}</button>
              </div>
            </div>
          } @else {
            <button type="button" class="mt-6 w-full text-center text-sm font-semibold text-ember-500 underline-offset-4 hover:underline"
                    (click)="confirmCancel.set(true)">{{ i18n.t('order.cancel') }}</button>
          }
        }
      } @else if (error()) {
        <div class="flex flex-col items-center gap-3 py-24 text-center">
          <mc-illustration name="receipt" class="size-36" />
          <p class="font-semibold">{{ error() }}</p>
          <a routerLink="/orders" class="btn-ghost">{{ i18n.t('orders.title') }}</a>
        </div>
      } @else {
        <div class="mt-4 space-y-3" aria-busy="true">
          <div class="h-36 animate-pulse rounded-[1.75rem] bg-line/60"></div>
          <div class="h-48 animate-pulse rounded-2xl bg-line/60"></div>
        </div>
      }
    </div>
  `,
})
export class OrderPage {
  readonly i18n = inject(I18n);
  readonly market = inject(MarketApi);
  private readonly shop = inject(ShopApi);
  private readonly motion = inject(Motion);
  private readonly injector = inject(Injector);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly badge = viewChild<ElementRef<HTMLElement>>('badge');

  /** route parameter */
  readonly number = input.required<string>();
  /** ?payment=success|cancel (Stripe return) */
  readonly payment = input<string>();
  /** ?placed=1 (cash order just confirmed) */
  readonly placed = input<string>();

  readonly steps = STEPS;
  readonly order = signal<OrderView | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly verifying = signal(false);
  readonly paymentNotice = signal<string | null>(null);
  readonly confirmCancel = signal(false);
  readonly stepIndex = computed(() => STEPS.indexOf(this.order()?.status ?? 'PLACED'));
  private stopped = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.stopped = true));
    effect(() => {
      const n = this.number();
      void this.load(n);
    });
  }

  icon(s: OrderStatus): string {
    return ICON[s];
  }

  selectionText(selections: { label: string }[]): string {
    return selections.map((s) => s.label).join(' · ');
  }

  private async load(number: string): Promise<void> {
    try {
      this.order.set(await this.shop.order(number));
      this.reveal();
      if (this.payment() === 'success' && this.order()?.status === 'AWAITING_PAYMENT') {
        await this.verifyPayment(number);
      } else if (this.payment() === 'cancel' && this.order()?.status === 'AWAITING_PAYMENT') {
        this.paymentNotice.set(this.i18n.t('order.paymentCanceled'));
      } else if (this.placed() && this.order()?.status === 'PLACED') {
        this.celebrateSoon();
      }
    } catch (e) {
      this.error.set(e instanceof ApiError && e.code === 'ORDER_NOT_FOUND'
        ? this.i18n.t('error.generic', { code: 'ORDER_NOT_FOUND' })
        : e instanceof ApiError && e.code === 'NETWORK_ERROR' ? this.i18n.t('error.network')
          : this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    }
  }

  /** Asks the backend to check with Stripe, for up to ~20 s (webhook-less dev setups included). */
  private async verifyPayment(number: string): Promise<void> {
    this.verifying.set(true);
    for (let attempt = 0; attempt < 10 && !this.stopped; attempt++) {
      try {
        const o = await this.shop.refreshPayment(number);
        this.order.set(o);
        if (o.status !== 'AWAITING_PAYMENT') {
          this.verifying.set(false);
          if (o.status === 'PLACED') this.celebrateSoon();
          return;
        }
        if (o.paymentStatus === 'FAILED') break;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    this.verifying.set(false);
    this.paymentNotice.set(this.i18n.t('order.paymentFailed'));
  }

  async payNow(): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.busy.set(true);
    try {
      const fresh = await this.shop.pay(o.number);
      if (fresh.paymentUrl) {
        location.assign(fresh.paymentUrl);
        return;
      }
      this.order.set(fresh);
    } catch (e) {
      this.paymentNotice.set(this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    }
    this.busy.set(false);
  }

  async cancel(): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.busy.set(true);
    try {
      this.order.set(await this.shop.cancel(o.number));
      this.confirmCancel.set(false);
    } catch (e) {
      this.paymentNotice.set(this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    } finally {
      this.busy.set(false);
    }
  }

  private reveal(): void {
    afterNextRender(() => {
      const root = this.root()?.nativeElement;
      if (root) this.motion.merchantIn(root);
    }, { injector: this.injector });
  }

  private celebrateSoon(): void {
    afterNextRender(() => setTimeout(() => this.motion.celebrate(this.badge()?.nativeElement ?? null), 350), { injector: this.injector });
  }
}
