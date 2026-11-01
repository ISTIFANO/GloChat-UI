import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Lang } from '../api/contracts';
import { DICTIONARY } from './dictionary';

/** Minimal signal-based i18n: FR (default), AR (right-to-left), EN. */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly doc = inject(DOCUMENT);
  readonly lang = signal<Lang>(readInitialLang());
  readonly dir = computed(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  private readonly locale = computed(() => ({ fr: 'fr-MA', ar: 'ar-MA', en: 'en-GB' })[this.lang()]);

  constructor() {
    effect(() => {
      const html = this.doc.documentElement;
      html.lang = this.lang();
      html.dir = this.dir();
      try {
        localStorage.setItem('mc.lang', this.lang());
      } catch {
        /* private browsing */
      }
    });
  }

  t(key: string, params: Record<string, string | number> = {}): string {
    const entry = DICTIONARY[key];
    let text = entry ? entry[this.lang()] : key;
    for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }

  /** Prices come from the backend; this only formats them. */
  price(amount: number): string {
    const whole = Number.isInteger(amount);
    const n = new Intl.NumberFormat(this.locale(), { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
    return this.lang() === 'ar' ? `${n} د.م.` : `${n} MAD`;
  }
}

function readInitialLang(): Lang {
  try {
    const saved = localStorage.getItem('mc.lang');
    if (saved === 'fr' || saved === 'ar' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'fr';
}
