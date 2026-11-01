import { Injectable, signal } from '@angular/core';
import { QuoteView } from '../api/contracts';

const KEY = 'mc.checkout';

/**
 * The quote being reviewed and ONE idempotency key per quote, kept in sessionStorage so a double tap,
 * a reload or a flaky network never creates two orders (the backend replays the first result).
 */
@Injectable({ providedIn: 'root' })
export class CheckoutStore {
  readonly quote = signal<QuoteView | null>(null);
  private key: string | null = null;

  constructor() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { quote: QuoteView; key: string } | null;
      if (saved) {
        this.quote.set(saved.quote);
        this.key = saved.key;
      }
    } catch {
      /* ignore */
    }
  }

  start(quote: QuoteView): void {
    this.quote.set(quote);
    this.key = crypto.randomUUID();
    sessionStorage.setItem(KEY, JSON.stringify({ quote, key: this.key }));
  }

  get idempotencyKey(): string {
    if (!this.key) throw new Error('no quote');
    return this.key;
  }

  done(): void {
    this.quote.set(null);
    this.key = null;
    sessionStorage.removeItem(KEY);
  }
}
