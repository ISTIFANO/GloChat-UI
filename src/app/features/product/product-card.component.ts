import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { I18n } from '../../core/i18n/i18n.service';
import { FoodImageComponent } from '../../shared/ui/food-image.component';

@Component({
  selector: 'mc-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FoodImageComponent],
  host: { class: 'block' },
  template: `
    <article
      class="card group relative flex h-full flex-col overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift"
      [class.opacity-60]="!card().merchantOpen"
      data-card
    >
      <button
        type="button"
        class="relative block aspect-[4/3] w-full overflow-hidden text-start"
        [style.background]="'linear-gradient(135deg,' + card().visual.from + ',' + card().visual.to + ')'"
        (click)="open.emit(card().productId)"
        [attr.aria-label]="card().name"
      >
        <mc-food-image class="size-full transition-transform duration-500 group-hover:scale-105"
                       [path]="card().imageUrl" [visual]="card().visual" [alt]="card().name" />
        <span class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent"></span>
        <span class="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
          <svg viewBox="0 0 20 20" class="size-3.5" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4.5v3.19l2.28 2.28-1.06 1.06-2.72-2.72V6.5h1.5Z"/></svg>
          <span dir="ltr">{{ card().etaText }}</span>
        </span>
        @if (!card().merchantOpen) {
          <span class="absolute end-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">{{ i18n.t('card.closed') }}</span>
        }
      </button>

      <div class="flex flex-1 flex-col gap-1 p-3.5">
        <h3 dir="auto" class="line-clamp-2 min-h-[2.5rem] text-start text-[0.92rem] font-bold leading-tight">{{ card().name }}</h3>
        <a [routerLink]="['/m', card().merchant.id]"
           class="flex min-w-0 items-center gap-1.5 text-xs text-muted transition hover:text-iris-600"
           [attr.aria-label]="card().merchant.name">
          @if (api.mediaUrl(card().merchant.logoUrl); as logo) {
            <img [src]="logo" alt="" class="size-4 shrink-0 rounded-[5px]" />
          } @else {
            <span aria-hidden="true">{{ card().merchant.emoji }}</span>
          }
          <span class="truncate font-medium">{{ card().merchant.name }}</span>
          <span aria-hidden="true">·</span>
          <span class="shrink-0" dir="ltr">{{ card().distanceKm }} km</span>
        </a>
        <div class="mt-auto flex items-center justify-between gap-2 pt-2">
          <div class="min-w-0">
            <p class="whitespace-nowrap text-[1.02rem] font-extrabold tracking-tight" dir="ltr">{{ i18n.price(card().price) }}</p>
            <p class="truncate text-[0.7rem] text-muted">🛵 <span dir="ltr">{{ i18n.price(card().deliveryFee) }}</span></p>
          </div>
          <button
            type="button"
            class="grid size-10 shrink-0 place-items-center rounded-full bg-iris-500 text-white shadow-glow transition active:scale-90 hover:bg-iris-600 disabled:bg-iris-200 disabled:shadow-none"
            [disabled]="!card().merchantOpen"
            [attr.aria-label]="(card().needsConfiguration ? i18n.t('card.choose') : i18n.t('card.add')) + ' ' + card().name"
            (click)="open.emit(card().productId)"
          >
            <svg viewBox="0 0 20 20" class="size-5" aria-hidden="true"><path fill="currentColor" d="M9 4h2v5h5v2h-5v5H9v-5H4V9h5z"/></svg>
          </button>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly i18n = inject(I18n);
  readonly api = inject(MarketApi);
  readonly card = input.required<ProductCard>();
  readonly open = output<string>();
}
