import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartStore } from '../../core/cart/cart.store';
import { I18n } from '../../core/i18n/i18n.service';
import { Motion } from '../../shared/motion/motion.service';

/** Keycloak redirects here with ?code=…&state=…; we exchange the code, replay a pending "add", and go back. */
@Component({
  selector: 'mc-auth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col items-center gap-4 px-6 py-28 text-center">
      @if (failed()) {
        <span class="text-5xl" aria-hidden="true">🔐</span>
        <p class="font-semibold">{{ i18n.t('auth.failed') }}</p>
        <a routerLink="/" class="btn-ghost">{{ i18n.t('merchant.back') }}</a>
      } @else {
        <span class="size-10 animate-spin rounded-full border-4 border-iris-200 border-t-iris-500" aria-hidden="true"></span>
        <p class="font-semibold text-muted" role="status">{{ i18n.t('auth.signingIn') }}</p>
      }
    </div>
  `,
})
export class AuthCallbackPage {
  readonly i18n = inject(I18n);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);
  private readonly motion = inject(Motion);
  readonly failed = signal(false);

  constructor() {
    void this.finish();
  }

  private async finish(): Promise<void> {
    try {
      const returnTo = await this.auth.handleCallback(new URLSearchParams(location.search));
      await this.router.navigateByUrl(returnTo, { replaceUrl: true });
      const result = await this.cart.resumePendingAdd();
      if (result?.kind === 'added') this.motion.pop(document.querySelector('[data-cart-button]'));
    } catch {
      this.failed.set(true);
    }
  }
}
