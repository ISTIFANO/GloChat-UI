import {
  ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild,
} from '@angular/core';
import { IconComponent } from '../../shared/ui/icon.component';
import { ApiError, GeoLocation, OptionGroup, ProductDetail } from '../../core/api/contracts';
import { MarketApi } from '../../core/api/market-api';
import { CartStore } from '../../core/cart/cart.store';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../../shared/motion/motion.service';
import { FoodImageComponent } from '../../shared/ui/food-image.component';
import { SelectionState, initialSelection, missingGroups, previewUnitPrice, toggle } from './option-selection';

/** Bottom sheet showing the real options of a product (GET /api/catalog/products/{id}). */
@Component({
  selector: 'mc-product-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FoodImageComponent],
  template: `
    <div class="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" [attr.aria-label]="detail()?.product?.name ?? ''">
      <div #backdrop class="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" (click)="close()"></div>

      <div #panel class="relative flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[var(--radius-sheet)] bg-surface shadow-lift">
        <div class="relative flex h-12 shrink-0 items-center justify-end border-b border-line/70 bg-surface px-3">
          <span class="absolute inset-x-0 top-2 mx-auto h-1.5 w-10 rounded-full bg-line"></span>
          <button type="button" class="grid size-9 place-items-center rounded-full bg-canvas text-ink transition hover:bg-line"
                  (click)="close()" [attr.aria-label]="i18n.t('sheet.close')">
            <svg viewBox="0 0 20 20" class="size-4"><path fill="currentColor" d="m5.7 4.3 4.3 4.3 4.3-4.3 1.4 1.4-4.3 4.3 4.3 4.3-1.4 1.4-4.3-4.3-4.3 4.3-1.4-1.4 4.3-4.3-4.3-4.3z"/></svg>
          </button>
        </div>

        @if (detail(); as d) {
          <div class="no-scrollbar overflow-y-auto">
            <mc-food-image #hero class="h-56 w-full" [path]="d.product.imageUrl" [visual]="d.product.visual"
                           [alt]="d.product.name" [eager]="true" emojiSize="6rem" data-sheet-item />

            <div class="space-y-5 px-5 pb-32 pt-5">
              <header data-sheet-item>
                <h2 class="text-2xl font-extrabold tracking-tight">{{ d.product.name }}</h2>
                <p dir="auto" class="mt-1 text-start text-sm leading-relaxed text-muted">{{ d.description }}</p>
                <p class="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-ink-soft">
                  <span class="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1"><mc-icon name="store" class="size-3.5 text-iris-500" /> {{ d.product.merchant.name }}</span>
                  <span class="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1"><mc-icon name="clock" class="size-3.5 text-iris-500" /> <span dir="ltr">{{ d.product.etaText }}</span></span>
                  <span class="rounded-full bg-canvas px-2.5 py-1">{{ i18n.t('card.delivery', { fee: i18n.price(d.product.deliveryFee) }) }}</span>
                </p>
              </header>

              @for (g of d.optionGroups; track g.id) {
                <section data-sheet-item [attr.data-group]="g.id">
                  <div class="mb-2 flex items-baseline justify-between">
                    <h3 class="font-bold">{{ g.name }}</h3>
                    <span class="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
                          [class]="g.required ? 'bg-iris-50 text-iris-600' : 'bg-canvas text-muted'">
                      {{ g.required ? i18n.t('sheet.required') : g.type === 'MULTI' ? i18n.t('sheet.upTo', { n: g.maxSelect }) : i18n.t('sheet.optional') }}
                    </span>
                  </div>
                  <div class="grid gap-2">
                    @for (v of g.values; track v.id) {
                      <button type="button"
                              class="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-start ring-1 transition active:scale-[0.99]"
                              [class]="isSelected(g, v.id) ? 'bg-iris-50 ring-iris-400' : 'bg-surface ring-line hover:ring-iris-200'"
                              [disabled]="!v.available"
                              [attr.aria-pressed]="isSelected(g, v.id)"
                              (click)="pick(g, v.id, $event)">
                        <span class="grid size-5 shrink-0 place-items-center border-2 transition"
                              [class]="(g.type === 'SINGLE' ? 'rounded-full ' : 'rounded-md ') + (isSelected(g, v.id) ? 'border-iris-500 bg-iris-500' : 'border-line')">
                          @if (isSelected(g, v.id)) {
                            <svg viewBox="0 0 20 20" class="size-3.5 text-white"><path fill="currentColor" d="m8 13.6-3.6-3.6L3 11.4l5 5 9-9-1.4-1.4z"/></svg>
                          }
                        </span>
                        <span class="flex-1 text-sm font-medium">{{ v.label }}</span>
                        @if (v.priceDelta > 0) {
                          <span class="text-sm font-semibold text-ink-soft" dir="ltr">+{{ i18n.price(v.priceDelta) }}</span>
                        }
                      </button>
                    }
                  </div>
                </section>
              }

              <section data-sheet-item class="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                <span class="font-semibold">{{ i18n.t('sheet.quantity') }}</span>
                <div class="flex items-center gap-3">
                  <button type="button" class="grid size-9 place-items-center rounded-full bg-surface text-lg font-bold shadow-soft disabled:opacity-40"
                          [disabled]="quantity() <= 1" (click)="setQty(quantity() - 1)" aria-label="-">−</button>
                  <span #qty class="w-6 text-center text-lg font-extrabold" aria-live="polite">{{ quantity() }}</span>
                  <button type="button" class="grid size-9 place-items-center rounded-full bg-surface text-lg font-bold shadow-soft disabled:opacity-40"
                          [disabled]="quantity() >= 50" (click)="setQty(quantity() + 1)" aria-label="+">+</button>
                </div>
              </section>
            </div>
          </div>

          <footer class="absolute inset-x-0 bottom-0 border-t border-line bg-surface/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            @if (conflict(); as m) {
              <div class="mb-2 rounded-2xl bg-ink px-4 py-3 text-sm text-white" role="alertdialog" aria-live="assertive">
                <p class="font-semibold">{{ i18n.t('sheet.conflict', { m }) }}</p>
                <div class="mt-2 flex gap-2">
                  <button type="button" class="flex-1 rounded-full bg-white/15 px-3 py-2 text-xs font-bold" (click)="conflict.set(null)">{{ i18n.t('sheet.keep') }}</button>
                  <button type="button" class="flex-1 rounded-full bg-zest-300 px-3 py-2 text-xs font-bold text-ink" (click)="startNewCart()">{{ i18n.t('sheet.newCart') }}</button>
                </div>
              </div>
            } @else if (notice()) {
              <p class="mb-2 rounded-xl bg-zest-300/70 px-3 py-2 text-center text-xs font-semibold text-ink" role="status">{{ notice() }}</p>
            }
            <button #cta type="button" class="btn-primary w-full text-base" [disabled]="adding()" (click)="addToCart()">
              @if (missing().length > 0) {
                {{ i18n.t('sheet.missing', { groups: missingNames() }) }}
              } @else {
                <span dir="ltr">{{ i18n.t('sheet.addToCart', { price: i18n.price(total()) }) }}</span>
              }
            </button>
          </footer>
        } @else if (error()) {
          <p class="p-10 text-center text-sm text-muted">{{ error() }}</p>
        } @else {
          <div class="space-y-4 p-5" aria-busy="true">
            <div class="h-44 animate-pulse rounded-3xl bg-canvas"></div>
            <div class="h-6 w-2/3 animate-pulse rounded-full bg-canvas"></div>
            <div class="h-4 w-full animate-pulse rounded-full bg-canvas"></div>
            <div class="h-12 w-full animate-pulse rounded-2xl bg-canvas"></div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProductSheetComponent {
  readonly i18n = inject(I18n);
  private readonly api = inject(MarketApi);
  private readonly motion = inject(Motion);

  readonly productId = input.required<string>();
  readonly location = input<GeoLocation>();
  readonly closed = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly backdrop = viewChild.required<ElementRef<HTMLElement>>('backdrop');
  private readonly qtyEl = viewChild<ElementRef<HTMLElement>>('qty');
  private readonly cta = viewChild<ElementRef<HTMLElement>>('cta');
  private readonly hero = viewChild('hero', { read: ElementRef });
  private readonly cart = inject(CartStore);
  readonly adding = signal(false);
  readonly conflict = signal<string | null>(null);

  readonly detail = signal<ProductDetail | null>(null);
  readonly error = signal<string | null>(null);
  readonly selection = signal<SelectionState>(new Map());
  readonly quantity = signal(1);
  readonly notice = signal<string | null>(null);

  readonly missing = computed(() => {
    const d = this.detail();
    return d ? missingGroups(d, this.selection()) : [];
  });
  readonly missingNames = computed(() => this.missing().map((g) => g.name).join(', '));
  readonly total = computed(() => {
    const d = this.detail();
    return d ? Math.round(previewUnitPrice(d, this.selection()) * this.quantity() * 100) / 100 : 0;
  });

  constructor() {
    afterNextRender(() => {
      this.motion.sheetIn(this.panel().nativeElement, this.backdrop().nativeElement);
      void this.load();
    });
  }

  private async load(): Promise<void> {
    try {
      const d = await this.api.getProduct(this.productId(), this.location());
      this.detail.set(d);
      this.selection.set(initialSelection(d));
    } catch (e) {
      this.error.set(e instanceof ApiError && e.code === 'NETWORK_ERROR'
        ? this.i18n.t('error.network')
        : this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    }
  }

  isSelected(g: OptionGroup, valueId: string): boolean {
    return this.selection().get(g.id)?.has(valueId) ?? false;
  }

  pick(g: OptionGroup, valueId: string, event: Event): void {
    this.selection.set(toggle(this.selection(), g, valueId));
    this.motion.pop(event.currentTarget as Element);
  }

  setQty(n: number): void {
    this.quantity.set(Math.max(1, Math.min(50, n)));
    this.motion.pop(this.qtyEl()?.nativeElement ?? null);
  }

  /** The backend validates and prices the line; we only send ids. */
  private request() {
    const optionValueIds = [...this.selection().values()].flatMap((set) => [...set]);
    return { productId: this.productId(), quantity: this.quantity(), optionValueIds };
  }

  async addToCart(): Promise<void> {
    if (this.missing().length > 0) {
      this.motion.shake(this.cta()?.nativeElement ?? null);
      return;
    }
    this.adding.set(true);
    this.notice.set(null);
    try {
      const result = await this.cart.add(this.request());
      if (result.kind === 'conflict') {
        this.conflict.set(result.currentMerchant || '…');
      } else if (result.kind === 'added') {
        await this.flyAndClose();
      }
    } catch (e) {
      this.motion.shake(this.cta()?.nativeElement ?? null);
      this.notice.set(e instanceof ApiError && e.code === 'NETWORK_ERROR'
        ? this.i18n.t('error.network')
        : this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    } finally {
      this.adding.set(false);
    }
  }

  async startNewCart(): Promise<void> {
    this.conflict.set(null);
    this.adding.set(true);
    try {
      await this.cart.replaceWith(this.request());
      await this.flyAndClose();
    } catch (e) {
      this.notice.set(this.i18n.t('error.generic', { code: e instanceof ApiError ? e.code : 'UNKNOWN' }));
    } finally {
      this.adding.set(false);
    }
  }

  private async flyAndClose(): Promise<void> {
    this.notice.set(this.i18n.t('sheet.added'));
    const fly = this.motion.flyToCart(this.hero()?.nativeElement ?? null);
    await this.close();
    await fly;
  }

  async close(): Promise<void> {
    await this.motion.sheetOut(this.panel().nativeElement, this.backdrop().nativeElement);
    this.closed.emit();
  }
}
