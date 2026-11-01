import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { LoginPrompt } from '../../core/auth/login-prompt.service';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../motion/motion.service';
import { LogoComponent } from './logo.component';

/** Sign-in sheet over the shop: "Continue with Google" (one tap) or e-mail, in a popup; the page never changes. */
@Component({
  selector: 'mc-login-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('login.title')">
      <div #backdrop class="absolute inset-0 bg-ink/40 backdrop-blur-[3px]" (click)="prompt.connecting() ? null : close()"></div>

      <div #panel class="relative w-full max-w-[480px] overflow-hidden rounded-t-[2rem] bg-surface px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-lift">
        <div class="pointer-events-none absolute -end-16 -top-16 size-48 rounded-full bg-iris-200/50 blur-2xl"></div>
        <div class="pointer-events-none absolute -start-14 top-24 size-36 rounded-full bg-zest-300/50 blur-2xl"></div>
        <span class="relative mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line"></span>

        @if (prompt.connecting()) {
          <div class="relative flex flex-col items-center gap-5 py-10 text-center" role="status">
            <mc-logo [size]="72" [animated]="true" />
            <p class="font-bold">{{ i18n.t('login.connecting') }}</p>
            <p class="max-w-xs text-sm text-muted">{{ i18n.t('login.popupHint') }}</p>
          </div>
        } @else {
          <div class="relative flex flex-col items-center text-center" data-sheet-item>
            <mc-logo [size]="56" [wordmark]="true" />
            <h2 class="mt-5 text-[1.45rem] font-extrabold leading-tight tracking-tight">
              {{ prompt.open() === 'cart' ? i18n.t('login.cartTitle') : i18n.t('login.title') }}
            </h2>
            <p class="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{{ i18n.t('login.subtitle') }}</p>
          </div>

          <div class="relative mt-6 grid gap-2.5" data-sheet-item>
            <button type="button" data-google
                    class="flex h-13 items-center justify-center gap-3 rounded-full bg-surface px-5 font-semibold text-ink shadow-soft ring-1 ring-line transition hover:ring-iris-200 active:scale-[0.98]"
                    (click)="prompt.signIn('google')">
              <svg viewBox="0 0 48 48" class="size-5" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              {{ i18n.t('login.google') }}
            </button>
            <button type="button" data-email
                    class="flex h-13 items-center justify-center gap-3 rounded-full bg-ink px-5 font-semibold text-white transition hover:bg-ink/90 active:scale-[0.98]"
                    (click)="prompt.signIn('email')">
              <svg viewBox="0 0 20 20" class="size-5" aria-hidden="true"><path fill="currentColor" d="M3 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm7 6.6L3.6 6v8h12.8V6L10 10.6ZM4.8 5.6 10 9.2l5.2-3.6H4.8Z"/></svg>
              {{ i18n.t('login.email') }}
            </button>
            @if (prompt.failed()) {
              <p class="text-center text-sm font-semibold text-ember-500" role="alert">{{ i18n.t('login.failed') }}</p>
            }
            <button type="button" class="mt-1 py-2 text-sm font-semibold text-muted hover:text-ink" (click)="close()" data-later>
              {{ prompt.open() === 'welcome' ? i18n.t('login.later') : i18n.t('order.no') }}
            </button>
          </div>
          <p class="relative mt-2 text-center text-[0.7rem] leading-relaxed text-muted">{{ i18n.t('login.legal') }}</p>
        }
      </div>
    </div>
  `,
})
export class LoginSheetComponent {
  readonly i18n = inject(I18n);
  readonly prompt = inject(LoginPrompt);
  private readonly motion = inject(Motion);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly backdrop = viewChild.required<ElementRef<HTMLElement>>('backdrop');

  constructor() {
    afterNextRender(() => this.motion.sheetIn(this.panel().nativeElement, this.backdrop().nativeElement));
  }

  async close(): Promise<void> {
    await this.motion.sheetOut(this.panel().nativeElement, this.backdrop().nativeElement);
    this.prompt.dismiss();
  }
}
