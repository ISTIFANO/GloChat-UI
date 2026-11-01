import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { IconComponent } from './icon.component';
import { ProductVisual } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';

/**
 * Product / cover photo with graceful fallback: while loading it shows the brand gradient,
 * and if the photo is missing or fails, a cloche icon on the gradient stays (never a broken image icon).
 */
@Component({
  selector: 'mc-food-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'relative block overflow-hidden' },
  template: `
    <div class="absolute inset-0 grid place-items-center"
         [style.background]="'linear-gradient(135deg,' + visual().from + ',' + visual().to + ')'">
      @if (!loaded()) {
        <mc-icon name="cloche" class="text-white/90 drop-shadow-[0_8px_14px_rgba(0,0,0,0.18)]" [stroke]="1.5"
                 [style.width]="emojiSize()" [style.height]="emojiSize()" />
      }
    </div>
    @if (src() && !failed()) {
      <img [src]="src()" [alt]="alt()" [attr.loading]="eager() ? 'eager' : 'lazy'" decoding="async"
           class="absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500"
           [class.opacity-0]="!loaded()"
           (load)="loaded.set(true)" (error)="failed.set(true)" />
    }
  `,
})
export class FoodImageComponent {
  private readonly api = inject(MarketApi);
  readonly path = input<string | null>(null);
  readonly visual = input.required<ProductVisual>();
  readonly alt = input('');
  readonly eager = input(false);
  readonly emojiSize = input('4rem');

  readonly loaded = signal(false);
  readonly failed = signal(false);
  readonly src = computed(() => this.api.mediaUrl(this.path()));
}
