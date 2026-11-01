import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let scrollTriggerReady = false;

/**
 * All GSAP animations in one place. Every animation is skipped when the user asked for reduced motion.
 * Animations only decorate: the UI is fully usable without them.
 */
@Injectable({ providedIn: 'root' })
export class Motion {
  private get reduced(): boolean {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Hero entrance: title, subtitle, composer and chips rise in sequence. */
  heroIn(root: HTMLElement): void {
    if (this.reduced) return;
    gsap.from(root.querySelectorAll('[data-hero]'), {
      y: 24, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.08,
    });
  }

  /** Result cards cascade in. */
  cardsIn(cards: Element[]): void {
    if (this.reduced || cards.length === 0) return;
    gsap.fromTo(cards, { y: 28, opacity: 0, scale: 0.96 }, {
      y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out', stagger: 0.06, clearProps: 'transform',
    });
  }

  /** Bottom sheet slides up with a soft overshoot; backdrop fades in. */
  sheetIn(panel: HTMLElement, backdrop: HTMLElement): void {
    if (this.reduced) return;
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
    gsap.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'back.out(1.1)' });
    gsap.from(panel.querySelectorAll('[data-sheet-item]'), {
      y: 16, opacity: 0, duration: 0.4, ease: 'power2.out', stagger: 0.04, delay: 0.12,
    });
  }

  sheetOut(panel: HTMLElement, backdrop: HTMLElement): Promise<void> {
    if (this.reduced) return Promise.resolve();
    return new Promise((resolve) => {
      gsap.to(backdrop, { opacity: 0, duration: 0.2 });
      gsap.to(panel, { yPercent: 100, duration: 0.3, ease: 'power2.in', onComplete: () => resolve() });
    });
  }

  /** Small tactile bounce (selected option, quantity change, price change). */
  pop(el: Element | null): void {
    if (this.reduced || !el) return;
    gsap.fromTo(el, { scale: 0.92 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' });
  }

  /** Error shake for invalid actions. */
  shake(el: Element | null): void {
    if (this.reduced || !el) return;
    gsap.fromTo(el, { x: 0 }, { x: 0, duration: 0.4, ease: 'none', keyframes: { x: [0, -8, 8, -5, 5, 0] } });
  }

  /** Cover photo moves slower than the page (parallax) and fades as you scroll. Returns a cleanup function. */
  parallax(cover: HTMLElement): () => void {
    if (this.reduced || typeof matchMedia === 'undefined') return () => undefined;
    if (!scrollTriggerReady) { gsap.registerPlugin(ScrollTrigger); scrollTriggerReady = true; }
    const tween = gsap.to(cover, {
      yPercent: 25, scale: 1.08, opacity: 0.7, ease: 'none',
      scrollTrigger: { trigger: cover, start: 'top top', end: 'bottom top', scrub: true },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }

  /**
   * "Fly to cart": a copy of the product picture arcs from where it was added to the cart button,
   * shrinking as it goes, then the button bounces. Resolves when the flight ends.
   */
  flyToCart(from: Element | null): Promise<void> {
    const target = document.querySelector('[data-cart-button]');
    if (this.reduced || !from || !target) {
      this.pop(target);
      return Promise.resolve();
    }
    const a = from.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const size = Math.min(140, Math.max(56, a.width * 0.45));
    const img = from.querySelector('img');
    const ghost = document.createElement('div');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      position: 'fixed', zIndex: '60', left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`,
      width: `${size}px`, height: `${size}px`, borderRadius: '999px', overflow: 'hidden', pointerEvents: 'none',
      boxShadow: '0 18px 40px -12px rgba(43,24,140,.55)', background: '#5b3df5', display: 'grid', placeItems: 'center',
      fontSize: `${size * 0.5}px`,
    } satisfies Partial<CSSStyleDeclaration>);
    if (img && img.complete && img.naturalWidth > 0) {
      const copy = img.cloneNode() as HTMLImageElement;
      Object.assign(copy.style, { width: '100%', height: '100%', objectFit: 'cover', opacity: '1' });
      copy.className = '';
      ghost.appendChild(copy);
    } else {
      ghost.innerHTML = '<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="#fff" stroke-width="1.8" '
        + 'stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12.5H6L5 8Z M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
    }
    document.body.appendChild(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    return new Promise((resolve) => {
      gsap.timeline({
        onComplete: () => {
          ghost.remove();
          gsap.fromTo(target, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' });
          resolve();
        },
      })
        .to(ghost, { duration: 0.75, x: dx, ease: 'power1.inOut' }, 0)
        .to(ghost, { duration: 0.75, y: dy, ease: 'back.in(1.6)' }, 0)
        .to(ghost, { duration: 0.75, scale: 0.18, ease: 'power2.in' }, 0)
        .to(ghost, { duration: 0.15, opacity: 0 }, 0.6);
    });
  }

  /** Small celebration when an order is placed: confetti bits burst from an element. */
  celebrate(origin: Element | null): void {
    if (this.reduced || !origin) return;
    const r = origin.getBoundingClientRect();
    const colors = ['#5b3df5', '#c8f23b', '#ff7a59', '#16131f', '#9d8bff'];
    for (let i = 0; i < 28; i++) {
      const bit = document.createElement('span');
      bit.setAttribute('aria-hidden', 'true');
      Object.assign(bit.style, {
        position: 'fixed', zIndex: '60', left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px`,
        width: `${6 + (i % 3) * 3}px`, height: `${10 + (i % 4) * 2}px`, borderRadius: '3px', pointerEvents: 'none',
        background: colors[i % colors.length],
      } satisfies Partial<CSSStyleDeclaration>);
      document.body.appendChild(bit);
      const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 110;
      gsap.timeline({ onComplete: () => bit.remove() })
        .to(bit, { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 60, rotate: Math.random() * 540, duration: 0.7, ease: 'power3.out' })
        .to(bit, { y: `+=${120 + Math.random() * 80}`, opacity: 0, duration: 0.9, ease: 'power1.in' });
    }
  }

  /** Merchant header and menu sections reveal. */
  merchantIn(root: HTMLElement): void {
    if (this.reduced) return;
    gsap.from(root.querySelectorAll('[data-reveal]'), {
      y: 22, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07, clearProps: 'transform',
    });
    gsap.from(root.querySelectorAll('[data-logo]'), { scale: 0.6, rotate: -8, opacity: 0, duration: 0.7, ease: 'back.out(1.8)' });
  }
}
