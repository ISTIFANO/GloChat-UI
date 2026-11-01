import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon.component';
import { RouterLink } from '@angular/router';
import { OrderView } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { ShopApi } from '../../core/api/shop-api';
import { AuthService } from '../../core/auth/auth.service';
import { I18n } from '../../core/i18n/i18n.service';
import { LoginPrompt } from '../../core/auth/login-prompt.service';
import { IllustrationComponent } from '../../shared/ui/illustration.component';

/** The customer's order history (their own orders only, enforced by the backend). */
@Component({
  selector: 'mc-orders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink, IllustrationComponent],
  template: `
    <div class="px-5 pb-24 pt-2">
      <div class="flex items-center justify-between">
        <h1 class="text-[1.7rem] font-extrabold tracking-tight">{{ i18n.t('orders.title') }}</h1>
        @if (auth.user(); as u) {
          <button type="button" class="chip !py-1.5 !text-xs" (click)="auth.logout()">{{ i18n.t('header.logout') }}</button>
        }
      </div>
      @if (auth.user(); as u) {
        <p class="mt-1 text-sm text-muted">{{ u.email }}</p>
      }

      @if (orders(); as list) {
        @if (list.length === 0) {
          <div class="mt-16 flex flex-col items-center gap-3 text-center">
            <mc-illustration name="receipt" class="size-40" />
            <p class="font-semibold">{{ i18n.t('orders.empty') }}</p>
            <a routerLink="/" class="btn-primary">{{ i18n.t('cart.browse') }}</a>
          </div>
        } @else {
          <ul class="mt-5 space-y-3">
            @for (o of list; track o.number) {
              <li>
                <a [routerLink]="['/orders', o.number]" class="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line/70 transition hover:ring-iris-200">
                  @if (market.mediaUrl(o.merchant.logoUrl); as logo) {
                    <img [src]="logo" [alt]="o.merchant.name" class="size-12 rounded-xl" />
                  } @else {
                    <span class="grid size-12 place-items-center rounded-xl bg-iris-50 text-iris-600"><mc-icon name="store" class="size-6" /></span>
                  }
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-bold">{{ o.merchant.name }}</p>
                    <p class="text-xs text-muted" dir="ltr">{{ o.number }} · {{ date(o.createdAt) }}</p>
                  </div>
                  <div class="text-end">
                    <p class="font-extrabold" dir="ltr">{{ i18n.price(o.total) }}</p>
                    <span class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
                          [class]="o.status === 'CANCELED' ? 'bg-line text-muted' : o.status === 'AWAITING_PAYMENT' ? 'bg-ember-500/10 text-ember-500' : 'bg-zest-300 text-ink'">
                      {{ i18n.t('order.status.' + o.status) }}
                    </span>
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      } @else if (!auth.loggedIn()) {
        <div class="mt-16 flex flex-col items-center gap-4 text-center">
          <span class="grid size-16 place-items-center rounded-[1.4rem] bg-iris-50 text-iris-600"><mc-icon name="lock" class="size-8" /></span>
          <button type="button" class="btn-primary" (click)="prompt.ask('account')">{{ i18n.t('header.login') }}</button>
        </div>
      } @else {
        <div class="mt-5 space-y-3" aria-busy="true">
          @for (i of [1, 2, 3]; track i) { <div class="h-[4.5rem] animate-pulse rounded-2xl bg-line/60"></div> }
        </div>
      }
    </div>
  `,
})
export class OrdersPage {
  readonly i18n = inject(I18n);
  readonly auth = inject(AuthService);
  readonly prompt = inject(LoginPrompt);
  readonly market = inject(MarketApi);
  private readonly shop = inject(ShopApi);
  readonly orders = signal<OrderView[] | null>(null);

  constructor() {
    if (this.auth.loggedIn()) {
      this.shop.orders().then((list) => this.orders.set(list)).catch(() => this.orders.set([]));
    }
  }

  date(iso: string): string {
    return new Intl.DateTimeFormat(this.i18n.lang() === 'ar' ? 'ar-MA' : this.i18n.lang() === 'en' ? 'en-GB' : 'fr-MA',
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }
}
