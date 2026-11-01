import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, signal, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GeoLocation, MerchantInfo } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../../shared/motion/motion.service';
import { FoodImageComponent } from '../../shared/ui/food-image.component';
import { IconComponent } from '../../shared/ui/icon.component';

/**
 * Home "Restaurants près de toi" swiper: every merchant (GET /api/catalog/merchants), open ones first.
 * Native scroll-snap (touch), mouse drag + arrows (desktop), a progress bar, and a GSAP entrance.
 */
@Component({
  selector: 'mc-merchant-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FoodImageComponent, IconComponent],
  template: `
    @if (merchants().length) {
      <section #root class="mt-4" [attr.aria-label]="i18n.t('home.restaurants')">
        <div class="mb-3 flex items-end justify-between gap-3 px-5">
          <div>
            <h2 class="text-lg font-extrabold leading-tight">{{ i18n.t('home.restaurants') }}</h2>
            <p class="text-xs text-muted">{{ i18n.t('home.restaurantsCount', { n: merchants().length, open: openCount() }) }}</p>
          </div>
          <div class="hidden gap-1.5 sm:flex">
            <button type="button" class="grid size-9 place-items-center rounded-full bg-surface ring-1 ring-line transition hover:ring-iris-200 disabled:opacity-40"
                    [disabled]="atStart()" (click)="page(-1)" [attr.aria-label]="i18n.t('home.prev')">
              <svg viewBox="0 0 20 20" class="size-4 rtl:-scale-x-100" aria-hidden="true"><path fill="currentColor" d="M12.7 4.3 7 10l5.7 5.7-1.4 1.4L4.2 10l7.1-7.1z"/></svg>
            </button>
            <button type="button" class="grid size-9 place-items-center rounded-full bg-surface ring-1 ring-line transition hover:ring-iris-200 disabled:opacity-40"
                    [disabled]="atEnd()" (click)="page(1)" [attr.aria-label]="i18n.t('home.next')">
              <svg viewBox="0 0 20 20" class="size-4 rtl:-scale-x-100" aria-hidden="true"><path fill="currentColor" d="m7.3 4.3 5.7 5.7-5.7 5.7 1.4 1.4 7.1-7.1-7.1-7.1z"/></svg>
            </button>
          </div>
        </div>

        <div #track class="no-scrollbar flex select-none snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scroll-smooth px-5 pb-3"
             [class.cursor-grab]="!dragging()" [class.cursor-grabbing]="dragging()"
             (scroll)="onScroll()" (pointerdown)="dragStart($event)" (pointermove)="dragMove($event)"
             (pointerup)="dragEnd()" (pointercancel)="dragEnd()" (dragstart)="$event.preventDefault()">
          @for (m of merchants(); track m.id) {
            <a [routerLink]="['/m', m.id]" data-merchant-slide draggable="false" (click)="guardClick($event)"
               class="group relative block w-[16.5rem] shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-lift"
               [class.opacity-70]="!m.open" [attr.aria-label]="m.name">
              <div class="relative h-32">
                <mc-food-image class="size-full transition-transform duration-500 group-hover:scale-105" [path]="m.coverUrl" [alt]="m.name"
                               [visual]="{ emoji: '', from: '#c9bcff', to: '#5b3df5' }" emojiSize="3rem" />
                <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"></span>
                @if (m.open) {
                  <span class="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[0.7rem] font-bold text-ink backdrop-blur">
                    <mc-icon name="scooter" class="size-3.5 text-iris-500" /> <span dir="ltr">{{ m.etaText }}</span>
                  </span>
                } @else {
                  <span class="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-[0.7rem] font-bold text-white">
                    <mc-icon name="moon" class="size-3.5" /> {{ i18n.t('card.closed') }}
                  </span>
                }
                <span class="absolute bottom-0 start-3 translate-y-1/2 overflow-hidden rounded-2xl bg-surface shadow-lift ring-[3px] ring-surface">
                  @if (api.mediaUrl(m.logoUrl); as logo) {
                    <img [src]="logo" [alt]="m.name" class="size-12" draggable="false" />
                  } @else {
                    <span class="grid size-12 place-items-center bg-iris-50 text-iris-600"><mc-icon name="store" class="size-6" /></span>
                  }
                </span>
              </div>
              <div class="px-3 pb-3 pt-8">
                <p class="truncate font-extrabold">{{ m.name }}</p>
                <p class="mt-0.5 truncate text-xs capitalize text-muted">{{ m.cuisineTags.join(' · ') }}</p>
                <p class="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-soft">
                  <span class="inline-flex items-center gap-1"><mc-icon name="pin" class="size-3.5 text-iris-500" /><span dir="ltr">{{ m.distanceKm }} km</span></span>
                  <span class="text-line">•</span>
                  <span class="inline-flex items-center gap-1" dir="ltr">{{ i18n.t('merchant.fee') }} {{ i18n.price(m.deliveryFee) }}</span>
                </p>
              </div>
            </a>
          }
        </div>

        <!-- scroll progress -->
        <div class="mx-5 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div class="h-full rounded-full bg-iris-500 transition-[width] duration-150" [style.width.%]="progress()"></div>
        </div>
      </section>
    }
  `,
})
export class MerchantCarouselComponent {
  readonly i18n = inject(I18n);
  readonly api = inject(MarketApi);
  private readonly motion = inject(Motion);
  private readonly injector = inject(Injector);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  readonly location = input.required<GeoLocation>();
  readonly merchants = signal<MerchantInfo[]>([]);
  readonly openCount = signal(0);
  readonly progress = signal(0);
  readonly atStart = signal(true);
  readonly atEnd = signal(false);
  readonly dragging = signal(false);

  private dragX = 0;
  private dragScroll = 0;
  private moved = 0;
  /** clicks right after a drag are the drag's release, not a tap */
  private suppressClickUntil = 0;

  constructor() {
    afterNextRender(() => void this.load());
  }

  private async load(): Promise<void> {
    try {
      const list = await this.api.listMerchants(this.location());
      this.merchants.set(list);
      this.openCount.set(list.filter((m) => m.open).length);
      afterNextRender(() => {
        this.onScroll();
        const slides = this.root()?.nativeElement.querySelectorAll('[data-merchant-slide]');
        if (slides) this.motion.cardsIn([...slides]);
      }, { injector: this.injector });
    } catch {
      /* the carousel is a bonus: the page works without it */
    }
  }

  onScroll(): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);   // RTL scrolls negative
    this.progress.set(max <= 0 ? 100 : Math.max(8, Math.min(100, ((pos + el.clientWidth) / el.scrollWidth) * 100)));
    this.atStart.set(pos <= 4);
    this.atEnd.set(pos >= max - 4);
  }

  /** One "page" = the visible width minus one card, so the next card is always partially visible. */
  page(direction: 1 | -1): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollBy({ left: direction * rtl * Math.max(200, el.clientWidth - 120), behavior: 'smooth' });
  }

  // mouse drag (touch uses native scrolling)
  dragStart(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = this.track()!.nativeElement;
    this.dragging.set(true);
    el.style.scrollSnapType = 'none';   // applied now, not at the next render
    this.dragX = e.clientX;
    this.dragScroll = el.scrollLeft;
    this.moved = 0;
  }

  dragMove(e: PointerEvent): void {
    if (!this.dragging()) return;
    const dx = e.clientX - this.dragX;
    this.moved = Math.max(this.moved, Math.abs(dx));
    const el = this.track()!.nativeElement;
    // capture only once it is really a drag: capturing on press would retarget a simple tap away from the link
    if (this.moved > 6 && !el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = this.dragScroll - dx;
  }

  dragEnd(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const el = this.track()?.nativeElement;
    if (this.moved > 6) this.suppressClickUntil = performance.now() + 120;
    this.moved = 0;
    if (!el) return;
    el.style.scrollBehavior = '';
    el.style.scrollSnapType = '';         // snap back to the nearest card
  }

  /** A drag must not open the restaurant under the pointer. */
  guardClick(e: MouseEvent): void {
    if (this.moved > 6 || performance.now() < this.suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}
