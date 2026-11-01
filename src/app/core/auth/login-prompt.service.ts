import { Injectable, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { AuthService, LoginProvider } from './auth.service';

export type LoginReason = 'welcome' | 'cart' | 'account';

/**
 * Asks the customer to sign in WITHOUT leaving the page: opens the sign-in sheet over the shop,
 * the login itself happens in a popup. {@link ask} resolves true once signed in, false if dismissed.
 */
@Injectable({ providedIn: 'root' })
export class LoginPrompt {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18n);
  private resolver: ((ok: boolean) => void) | null = null;

  /** the open sheet, or null */
  readonly open = signal<LoginReason | null>(null);
  /** a popup is in progress */
  readonly connecting = signal<LoginProvider | null>(null);
  readonly failed = signal(false);

  ask(reason: LoginReason): Promise<boolean> {
    if (this.auth.loggedIn()) return Promise.resolve(true);
    this.resolver?.(false);
    this.failed.set(false);
    this.open.set(reason);
    return new Promise((resolve) => (this.resolver = resolve));
  }

  async signIn(provider: LoginProvider): Promise<void> {
    this.connecting.set(provider);
    this.failed.set(false);
    try {
      const ok = await this.auth.loginWithPopup(this.i18n.lang(), provider);
      if (ok) {
        this.close(true);
      } else {
        this.failed.set(!this.auth.loggedIn());
      }
    } finally {
      this.connecting.set(null);
    }
  }

  dismiss(): void {
    if (this.open() === 'welcome') sessionStorage.setItem('mc.welcomeDismissed', '1');
    this.close(false);
  }

  /** The welcome sheet is shown once per visit to signed-out customers. */
  shouldWelcome(): boolean {
    return !this.auth.loggedIn() && !sessionStorage.getItem('mc.welcomeDismissed');
  }

  private close(ok: boolean): void {
    this.open.set(null);
    const r = this.resolver;
    this.resolver = null;
    r?.(ok);
  }
}
