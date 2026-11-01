import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { environment } from '../environments/environment';
import { Lang } from './core/api/contracts';
import { I18n } from './core/i18n/i18n.service';
import { AuthService } from './core/auth/auth.service';
import { CartStore } from './core/cart/cart.store';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="relative mx-auto min-h-dvh max-w-[480px] overflow-hidden bg-canvas sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:shadow-lift sm:ring-1 sm:ring-line">
      <!-- decorative glow -->
      <div class="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-iris-200/60 blur-3xl"></div>
      <div class="pointer-events-none absolute -start-20 top-40 size-56 rounded-full bg-zest-300/50 blur-3xl"></div>

      <header class="sticky top-0 z-30 flex items-center justify-between gap-3 bg-canvas/80 px-5 py-3 backdrop-blur-md">
        <a routerLink="/" class="flex items-center gap-2" aria-label="MarketChat">
          <span class="grid size-9 place-items-center rounded-2xl bg-iris-500 text-white shadow-glow">
            <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
              <path fill="currentColor" d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7a3.5 3.5 0 0 1-3.5 3.5H11l-4.6 3.7A.9.9 0 0 1 5 19v-3.1A3.5 3.5 0 0 1 4 12.5v-7Zm8.9 1.6-.9 2.6-2.6.9 2.6.9.9 2.6.9-2.6 2.6-.9-2.6-.9-.9-2.6Z"/>
            </svg>
          </span>
          <span class="hidden text-lg font-extrabold tracking-tight min-[420px]:inline">market<span class="text-iris-500">chat</span></span>
        </a>

        <div class="flex items-center gap-1.5">
          <button type="button" class="chip hidden max-w-[8.5rem] !py-1.5 !text-xs min-[430px]:inline-flex" [attr.aria-label]="i18n.t('header.deliverTo') + ' ' + locationLabel">
            <svg viewBox="0 0 20 20" class="size-3.5 text-iris-500" aria-hidden="true"><path fill="currentColor" d="M10 1.5a6 6 0 0 0-6 6c0 4.4 6 11 6 11s6-6.6 6-11a6 6 0 0 0-6-6Zm0 8.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z"/></svg>
            <span class="truncate">{{ locationLabel }}</span>
          </button>
          <div class="flex rounded-full bg-surface p-0.5 text-xs font-bold ring-1 ring-line" role="group" [attr.aria-label]="i18n.t('lang.label')">
            @for (l of langs; track l.code) {
              <button type="button" class="rounded-full px-2 py-1 transition"
                      [class]="i18n.lang() === l.code ? 'bg-ink text-white' : 'text-muted'"
                      [attr.aria-pressed]="i18n.lang() === l.code"
                      (click)="i18n.lang.set(l.code)">{{ l.label }}</button>
            }
          </div>
          @if (auth.user(); as u) {
            <a routerLink="/orders" class="grid size-9 place-items-center rounded-full bg-zest-300 text-sm font-extrabold text-ink ring-2 ring-surface"
               [attr.aria-label]="i18n.t('header.account')" data-account>{{ u.initial }}</a>
          } @else {
            <button type="button" class="grid size-9 place-items-center rounded-full bg-surface text-ink ring-1 ring-line transition hover:ring-iris-200"
                    [attr.aria-label]="i18n.t('header.login')" (click)="login()" data-login>
              <svg viewBox="0 0 20 20" class="size-4" aria-hidden="true"><path fill="currentColor" d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6H3Z"/></svg>
            </button>
          }
          <a routerLink="/cart" data-cart-button class="relative grid size-9 place-items-center rounded-full bg-ink text-white shadow-soft transition active:scale-95"
             [attr.aria-label]="i18n.t('header.cart') + (cart.count() ? ' (' + cart.count() + ')' : '')">
            <svg viewBox="0 0 24 24" class="size-[1.15rem]" aria-hidden="true"><path fill="currentColor" d="M7 4h13l-1.6 8.1a2 2 0 0 1-2 1.6H9.1L9.5 16H19v2H8a1 1 0 0 1-1-.8L4.6 4H2V2h3.4a1 1 0 0 1 1 .8L7 4Zm2 17a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>
            @if (cart.count() > 0) {
              <span class="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-zest-300 px-1 text-[0.65rem] font-extrabold text-ink ring-2 ring-canvas"
                    data-cart-count>{{ cart.count() }}</span>
            }
          </a>
        </div>
      </header>

      <main class="relative">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  readonly i18n = inject(I18n);
  readonly auth = inject(AuthService);
  readonly cart = inject(CartStore);
  readonly locationLabel = environment.defaultLocation.label;
  login(): void {
    void this.auth.login(location.pathname + location.search, this.i18n.lang());
  }

  readonly langs: { code: Lang; label: string }[] = [
    { code: 'fr', label: 'FR' },
    { code: 'ar', label: 'ع' },
    { code: 'en', label: 'EN' },
  ];
}
