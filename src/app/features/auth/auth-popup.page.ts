import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { I18n } from '../../core/i18n/i18n.service';
import { LogoComponent } from '../../shared/ui/logo.component';

/**
 * Runs inside the login popup: hands the authorization response (code + state) to the shop window, which
 * exchanges it with its PKCE verifier, then closes. Without an opener (popup turned into a tab) it finishes
 * the login itself.
 */
@Component({
  selector: 'mc-auth-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent],
  template: `
    <div class="fixed inset-0 z-[70] grid place-content-center justify-items-center gap-5 bg-canvas text-center">
      <mc-logo [size]="80" [animated]="!failed()" />
      <p class="font-bold" role="status">{{ failed() ? i18n.t('auth.failed') : i18n.t('auth.signingIn') }}</p>
    </div>
  `,
})
export class AuthPopupPage {
  readonly i18n = inject(I18n);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly failed = signal(false);

  constructor() {
    const search = location.search;
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'glochat-auth', search }, location.origin);
      setTimeout(() => window.close(), 150);
      return;
    }
    this.auth.handleCallback(new URLSearchParams(search), this.auth.popupRedirectUri)
      .then((returnTo) => this.router.navigateByUrl(returnTo, { replaceUrl: true }))
      .catch(() => this.failed.set(true));
  }
}
