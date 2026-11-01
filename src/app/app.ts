import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { environment } from '../environments/environment';
import { Lang } from './core/api/contracts';
import { I18n } from './core/i18n/i18n.service';
import { DiscoverPage } from './features/discover/discover.page';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DiscoverPage],
  template: `
    <div class="relative mx-auto min-h-dvh max-w-[480px] overflow-hidden bg-canvas sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:shadow-lift sm:ring-1 sm:ring-line">
      <!-- decorative glow -->
      <div class="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-iris-200/60 blur-3xl"></div>
      <div class="pointer-events-none absolute -start-20 top-40 size-56 rounded-full bg-zest-300/50 blur-3xl"></div>

      <header class="sticky top-0 z-30 flex items-center justify-between gap-3 bg-canvas/80 px-5 py-3 backdrop-blur-md">
        <a href="/" class="flex items-center gap-2" aria-label="MarketChat">
          <span class="grid size-9 place-items-center rounded-2xl bg-iris-500 text-white shadow-glow">
            <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
              <path fill="currentColor" d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7a3.5 3.5 0 0 1-3.5 3.5H11l-4.6 3.7A.9.9 0 0 1 5 19v-3.1A3.5 3.5 0 0 1 4 12.5v-7Zm8.9 1.6-.9 2.6-2.6.9 2.6.9.9 2.6.9-2.6 2.6-.9-2.6-.9-.9-2.6Z"/>
            </svg>
          </span>
          <span class="hidden text-lg font-extrabold tracking-tight min-[420px]:inline">market<span class="text-iris-500">chat</span></span>
        </a>

        <div class="flex items-center gap-2">
          <button type="button" class="chip max-w-[9.5rem] !py-1.5 !text-xs" [attr.aria-label]="i18n.t('header.deliverTo') + ' ' + locationLabel">
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
        </div>
      </header>

      <main class="relative">
        <mc-discover />
      </main>
    </div>
  `,
})
export class App {
  readonly i18n = inject(I18n);
  readonly locationLabel = environment.defaultLocation.label;
  readonly langs: { code: Lang; label: string }[] = [
    { code: 'fr', label: 'FR' },
    { code: 'ar', label: 'ع' },
    { code: 'en', label: 'EN' },
  ];
}
