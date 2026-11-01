import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild,
} from '@angular/core';
import { IconComponent } from '../../shared/ui/icon.component';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiError, ProductCard } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { I18n } from '../../core/i18n/i18n.service';
import { LoginPrompt } from '../../core/auth/login-prompt.service';
import { Motion } from '../../shared/motion/motion.service';
import { ProductCardComponent } from '../product/product-card.component';
import { ProductSheetComponent } from '../product/product-sheet.component';
import { parseQuery } from './query-parser';

interface Suggestion {
  key: string;
  icon: string;
  query: string;
}

@Component({
  selector: 'mc-discover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FormsModule, ProductCardComponent, ProductSheetComponent],
  template: `
    <section #hero class="px-5 pb-4 pt-6">
      <p data-hero class="inline-flex items-center gap-2 rounded-full bg-zest-300/70 px-3 py-1 text-xs font-bold text-ink">
        <span class="size-1.5 rounded-full bg-zest-600"></span>{{ i18n.t('brand.tagline') }}
      </p>
      <h1 data-hero class="mt-3 text-[2rem] font-extrabold leading-[1.1] tracking-tight">{{ i18n.t('hero.title') }}</h1>
      <p data-hero class="mt-2 max-w-sm text-[0.95rem] leading-relaxed text-muted">{{ i18n.t('hero.subtitle') }}</p>

      <form data-hero class="relative mt-5" (ngSubmit)="submit()">
        <div #composer class="flex items-center gap-2 rounded-[1.4rem] bg-surface p-2 ps-4 shadow-soft ring-1 ring-line transition focus-within:ring-2 focus-within:ring-iris-400">
          <svg viewBox="0 0 24 24" class="size-5 shrink-0 text-iris-500" aria-hidden="true">
            <path fill="currentColor" d="M12 2 13.8 8.2 20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm6.5 12 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z"/>
          </svg>
          <input
            name="q"
            class="min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] outline-none placeholder:text-muted/80"
            [placeholder]="i18n.t('composer.placeholder')"
            [(ngModel)]="text"
            autocomplete="off"
            maxlength="120"
            [attr.aria-label]="i18n.t('composer.placeholder')"
          />
          <button type="submit" class="btn-primary !px-4 !py-2.5" [disabled]="loading() || !text.trim()">
            {{ i18n.t('composer.send') }}
          </button>
        </div>
      </form>

      <div data-hero class="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        @for (s of suggestions; track s.key) {
          <button type="button" class="chip" (click)="useSuggestion(s)">
            <mc-icon [name]="s.icon" class="size-5" />{{ i18n.t(s.key) }}
          </button>
        }
      </div>
    </section>

    <section class="px-5 pb-28" aria-live="polite">
      @if (loading()) {
        <div class="grid grid-cols-2 gap-3" aria-busy="true">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="card overflow-hidden">
              <div class="aspect-[4/3] animate-pulse bg-canvas"></div>
              <div class="space-y-2 p-3.5">
                <div class="h-4 w-4/5 animate-pulse rounded-full bg-canvas"></div>
                <div class="h-3 w-3/5 animate-pulse rounded-full bg-canvas"></div>
                <div class="h-8 w-full animate-pulse rounded-full bg-canvas"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="card flex flex-col items-center gap-2 p-8 text-center">
          <span class="grid size-14 place-items-center rounded-2xl bg-ember-500/10 text-ember-500"><mc-icon name="wifi-off" class="size-7" /></span>
          <p class="text-sm font-medium text-ink-soft">{{ error() }}</p>
          <button type="button" class="btn-ghost mt-2" (click)="retry()">↻</button>
        </div>
      } @else if (searched()) {
        @if (results().length > 0) {
          <h2 class="mb-3 flex flex-wrap items-baseline gap-x-2 text-lg font-extrabold">
            {{ i18n.t('results.found', { n: results().length }) }}
            <span class="text-sm font-medium text-muted">{{ i18n.t('results.for', { q: lastQuery() }) }}</span>
          </h2>
          <div #grid class="grid grid-cols-2 gap-3">
            @for (p of results(); track p.productId) {
              <mc-product-card [card]="p" (open)="openProduct($event)" />
            }
          </div>
        } @else {
          <div class="card flex flex-col items-center gap-2 p-8 text-center">
            <span class="grid size-16 place-items-center rounded-[1.4rem] bg-iris-50 text-iris-600"><mc-icon name="cloche" class="size-8" /></span>
            <p class="font-bold">{{ i18n.t('results.empty.title') }}</p>
            <p class="text-sm text-muted">{{ i18n.t('results.empty.text') }}</p>
          </div>
        }
      }
    </section>

    @if (openProductId(); as id) {
      <mc-product-sheet [productId]="id" [location]="location" (closed)="openProductId.set(null)" />
    }
  `,
})
export class DiscoverPage {
  private readonly prompt = inject(LoginPrompt);
  readonly i18n = inject(I18n);
  private readonly api = inject(MarketApi);
  private readonly motion = inject(Motion);
  private readonly injector = inject(Injector);

  private readonly hero = viewChild.required<ElementRef<HTMLElement>>('hero');
  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  readonly location = { lat: environment.defaultLocation.lat, lng: environment.defaultLocation.lng };
  readonly suggestions: Suggestion[] = [
    { key: 'chip.burger', icon: 'burger', query: 'burger' },
    { key: 'chip.sushi2', icon: 'sushi', query: 'sushi pour 2' },
    { key: 'chip.healthy', icon: 'salad', query: 'healthy sous 70' },
    { key: 'chip.sweet', icon: 'cake', query: 'dessert sucré' },
    { key: 'chip.tajine', icon: 'tajine', query: 'tajine' },
    { key: 'chip.coffee', icon: 'coffee', query: 'café latte' },
  ];

  text = '';
  readonly loading = signal(false);
  readonly searched = signal(false);
  readonly results = signal<ProductCard[]>([]);
  readonly error = signal<string | null>(null);
  readonly lastQuery = signal('');
  readonly openProductId = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      this.motion.heroIn(this.hero().nativeElement);
      if (this.prompt.shouldWelcome()) setTimeout(() => this.prompt.shouldWelcome() && void this.prompt.ask('welcome'), 900);
    });
  }

  useSuggestion(s: Suggestion): void {
    this.text = s.query;
    void this.submit();
  }

  retry(): void {
    void this.submit(this.lastQuery());
  }

  async submit(raw = this.text): Promise<void> {
    const text = raw.trim();
    if (!text || this.loading()) return;
    const parsed = parseQuery(text);
    this.lastQuery.set(text);
    this.loading.set(true);
    this.error.set(null);
    try {
      const results = await this.api.search({
        query: parsed.query,
        location: this.location,
        maxPrice: parsed.maxPrice,
        partySize: parsed.partySize,
        limit: 8,
      });
      this.results.set(results);
      this.searched.set(true);
      afterNextRender(() => {
        const grid = this.grid()?.nativeElement;
        if (grid) this.motion.cardsIn(Array.from(grid.querySelectorAll('[data-card]')));
      }, { injector: this.injector });
    } catch (e) {
      this.error.set(e instanceof ApiError && e.code === 'NETWORK_ERROR'
        ? this.i18n.t('error.network')
        : this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    } finally {
      this.loading.set(false);
    }
  }

  openProduct(productId: string): void {
    this.openProductId.set(productId);
  }
}
