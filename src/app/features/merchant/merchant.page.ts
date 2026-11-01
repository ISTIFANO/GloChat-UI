import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, effect, inject, input, signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../shared/ui/icon.component';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiError, MerchantPage } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../../shared/motion/motion.service';
import { FoodImageComponent } from '../../shared/ui/food-image.component';
import { ProductSheetComponent } from '../product/product-sheet.component';

/** Merchant page: GET /api/catalog/merchants/{id} — real branding, hours, delivery terms and menu. */
@Component({
  selector: 'mc-merchant-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink, FoodImageComponent, ProductSheetComponent],
  template: `
    @if (page(); as p) {
      <div #root>
        <!-- cover with parallax -->
        <div class="relative h-60 overflow-hidden">
          <div #cover class="absolute inset-0 origin-top">
            <mc-food-image class="size-full" [path]="p.merchant.coverUrl" [alt]="p.merchant.name" [eager]="true"
                           [visual]="{ emoji: '', from: '#c9bcff', to: '#5b3df5' }" emojiSize="5rem" />
          </div>
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-canvas"></div>
          <a routerLink="/" class="absolute start-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-soft backdrop-blur transition active:scale-95"
             [attr.aria-label]="i18n.t('merchant.back')">
            <svg viewBox="0 0 20 20" class="size-5 rtl:-scale-x-100" aria-hidden="true"><path fill="currentColor" d="M12.7 4.3 7 10l5.7 5.7-1.4 1.4L4.2 10l7.1-7.1z"/></svg>
          </a>
        </div>

        <!-- identity -->
        <section class="relative -mt-14 px-5">
          <div class="flex items-end gap-3">
            <div data-logo class="size-20 shrink-0 overflow-hidden rounded-[1.4rem] bg-surface shadow-lift ring-4 ring-canvas">
              @if (api.mediaUrl(p.merchant.logoUrl); as logo) {
                <img [src]="logo" [alt]="p.merchant.name" class="size-full" />
              } @else {
                <span class="grid size-full place-items-center bg-iris-50 text-iris-600"><mc-icon name="store" class="size-9" /></span>
              }
            </div>
            <span data-reveal class="mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                  [class]="p.merchant.open ? 'bg-zest-300 text-ink' : 'bg-ink text-white'">
              <span class="size-1.5 rounded-full" [class]="p.merchant.open ? 'bg-success' : 'bg-ember-500'"></span>
              {{ p.merchant.open ? i18n.t('merchant.open') : i18n.t('merchant.closed') }}
              @if (p.merchant.todayHours) {
                <span class="opacity-60" aria-hidden="true">·</span><span class="font-medium opacity-80" dir="ltr">{{ p.merchant.todayHours }}</span>
              }
            </span>
          </div>
          <h1 data-reveal class="mt-3 text-[1.7rem] font-extrabold leading-tight tracking-tight">{{ p.merchant.name }}</h1>
          <p data-reveal dir="auto" class="mt-1 text-start text-sm leading-relaxed text-muted">{{ p.merchant.description }}</p>
          <div data-reveal class="mt-3 flex flex-wrap gap-1.5">
            @for (tag of p.merchant.cuisineTags; track tag) {
              <span class="rounded-full bg-iris-50 px-2.5 py-1 text-xs font-semibold capitalize text-iris-700">{{ tag }}</span>
            }
          </div>

          <!-- delivery terms -->
          <dl data-reveal class="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-surface p-3 text-center shadow-soft ring-1 ring-line/70">
            <div><dt class="text-[0.65rem] font-medium uppercase tracking-wide text-muted">{{ i18n.t('merchant.eta') }}</dt>
                 <dd class="mt-0.5 text-sm font-bold" dir="ltr">{{ p.merchant.etaText }}</dd></div>
            <div><dt class="text-[0.65rem] font-medium uppercase tracking-wide text-muted">{{ i18n.t('merchant.fee') }}</dt>
                 <dd class="mt-0.5 text-sm font-bold" dir="ltr">{{ i18n.price(p.merchant.deliveryFee) }}</dd></div>
            <div><dt class="text-[0.65rem] font-medium uppercase tracking-wide text-muted">{{ i18n.t('merchant.minimum') }}</dt>
                 <dd class="mt-0.5 text-sm font-bold" dir="ltr">{{ i18n.price(p.merchant.minOrderAmount) }}</dd></div>
            <div><dt class="text-[0.65rem] font-medium uppercase tracking-wide text-muted">{{ i18n.t('merchant.distance') }}</dt>
                 <dd class="mt-0.5 text-sm font-bold" dir="ltr">{{ p.merchant.distanceKm }} km</dd></div>
          </dl>

          @if (!p.merchant.open) {
            <p data-reveal class="mt-3 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white">
              <mc-icon name="moon" class="me-1 size-[1.1rem]" /> {{ i18n.t('merchant.closedBanner', { h: p.merchant.todayHours ?? '—' }) }}
            </p>
          } @else if (!p.merchant.delivers) {
            <p data-reveal class="mt-3 rounded-2xl bg-ember-500/10 px-4 py-3 text-sm font-medium text-ember-500">
              <mc-icon name="pin" class="me-1 size-[1.1rem]" /> {{ i18n.t('merchant.outOfZone') }}
            </p>
          }
        </section>

        <!-- sticky category tabs -->
        <nav class="no-scrollbar sticky top-[60px] z-20 mt-5 flex gap-2 overflow-x-auto bg-canvas/90 px-5 py-2.5 backdrop-blur-md">
          @for (s of p.sections; track s.id) {
            <button type="button" class="chip shrink-0 !py-1.5"
                    [class.!bg-ink]="activeSection() === s.id" [class.!text-white]="activeSection() === s.id"
                    [class.!ring-ink]="activeSection() === s.id"
                    (click)="scrollTo(s.id)">
              {{ s.name }} <span class="opacity-60">{{ s.products.length }}</span>
            </button>
          }
        </nav>

        <!-- menu -->
        <div class="space-y-7 px-5 pb-28 pt-3">
          @for (s of p.sections; track s.id) {
            <section [id]="'sec-' + s.id" data-reveal class="scroll-mt-32" [attr.data-section]="s.id">
              <h2 class="mb-3 text-lg font-extrabold">{{ s.name }}</h2>
              <div class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-line/70">
                @for (prod of s.products; track prod.productId) {
                  <button type="button" class="flex w-full items-stretch gap-3 p-3 text-start transition hover:bg-iris-50/50 active:bg-iris-50"
                          [disabled]="!p.merchant.open" (click)="openProduct.set(prod.productId)"
                          [attr.aria-label]="prod.name">
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span dir="auto" class="text-start font-bold leading-snug">{{ prod.name }}</span>
                      <span dir="auto" class="mt-0.5 line-clamp-2 text-start text-xs leading-relaxed text-muted">{{ prod.shortDescription }}</span>
                      <span class="mt-auto pt-2 font-extrabold" dir="ltr">{{ i18n.price(prod.price) }}</span>
                    </div>
                    <div class="relative size-24 shrink-0 overflow-hidden rounded-2xl">
                      <mc-food-image class="size-full" [path]="prod.imageUrl" [visual]="prod.visual" [alt]="prod.name" emojiSize="2.6rem" />
                      @if (p.merchant.open) {
                        <span class="absolute bottom-1.5 end-1.5 grid size-8 place-items-center rounded-full bg-surface text-iris-600 shadow-soft">
                          <svg viewBox="0 0 20 20" class="size-4" aria-hidden="true"><path fill="currentColor" d="M9 4h2v5h5v2h-5v5H9v-5H4V9h5z"/></svg>
                        </span>
                      }
                    </div>
                  </button>
                }
              </div>
            </section>
          }
        </div>
      </div>
    } @else if (error()) {
      <div class="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <span class="grid size-16 place-items-center rounded-[1.4rem] bg-iris-50 text-iris-600"><mc-icon name="store" class="size-8" /></span>
        <p class="font-semibold">{{ error() }}</p>
        <a routerLink="/" class="btn-ghost">{{ i18n.t('merchant.back') }}</a>
      </div>
    } @else {
      <div aria-busy="true">
        <div class="h-60 animate-pulse bg-line/60"></div>
        <div class="space-y-3 px-5 pt-4">
          <div class="size-20 animate-pulse rounded-[1.4rem] bg-line/60"></div>
          <div class="h-7 w-2/3 animate-pulse rounded-full bg-line/60"></div>
          <div class="h-4 w-full animate-pulse rounded-full bg-line/60"></div>
          <div class="h-16 w-full animate-pulse rounded-2xl bg-line/60"></div>
        </div>
      </div>
    }

    @if (openProduct(); as id) {
      <mc-product-sheet [productId]="id" [location]="location" (closed)="openProduct.set(null)" />
    }
  `,
})
export class MerchantPageComponent {
  readonly i18n = inject(I18n);
  readonly api = inject(MarketApi);
  private readonly motion = inject(Motion);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** bound from the route parameter :merchantId */
  readonly merchantId = input.required<string>();

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly cover = viewChild<ElementRef<HTMLElement>>('cover');

  readonly location = { lat: environment.defaultLocation.lat, lng: environment.defaultLocation.lng };
  readonly page = signal<MerchantPage | null>(null);
  readonly error = signal<string | null>(null);
  readonly openProduct = signal<string | null>(null);
  readonly activeSection = signal<string | null>(null);

  private cleanup: (() => void)[] = [];

  constructor() {
    effect(() => {
      const id = this.merchantId();
      void this.load(id);
    });
    this.destroyRef.onDestroy(() => this.cleanup.forEach((c) => c()));
  }

  private async load(id: string): Promise<void> {
    this.page.set(null);
    this.error.set(null);
    try {
      const p = await this.api.getMerchant(id, this.location);
      this.page.set(p);
      this.activeSection.set(p.sections[0]?.id ?? null);
      afterNextRender(() => this.afterRender(), { injector: this.injector });
    } catch (e) {
      this.error.set(e instanceof ApiError && e.code === 'MERCHANT_NOT_FOUND'
        ? this.i18n.t('merchant.notFound')
        : e instanceof ApiError && e.code === 'NETWORK_ERROR'
          ? this.i18n.t('error.network')
          : this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    }
  }

  private afterRender(): void {
    const root = this.root()?.nativeElement;
    const cover = this.cover()?.nativeElement;
    if (!root) return;
    window.scrollTo({ top: 0 });
    this.motion.merchantIn(root);
    if (cover) this.cleanup.push(this.motion.parallax(cover));

    // highlight the category tab of the section in view
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.getAttribute('data-section');
        if (id) this.activeSection.set(id);
      }, { rootMargin: '-140px 0px -55% 0px' });
      root.querySelectorAll('[data-section]').forEach((el) => io.observe(el));
      this.cleanup.push(() => io.disconnect());
    }
  }

  scrollTo(sectionId: string): void {
    this.activeSection.set(sectionId);
    document.getElementById('sec-' + sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
