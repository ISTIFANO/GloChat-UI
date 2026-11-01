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

  /** Merchant header and menu sections reveal. */
  merchantIn(root: HTMLElement): void {
    if (this.reduced) return;
    gsap.from(root.querySelectorAll('[data-reveal]'), {
      y: 22, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07, clearProps: 'transform',
    });
    gsap.from(root.querySelectorAll('[data-logo]'), { scale: 0.6, rotate: -8, opacity: 0, duration: 0.7, ease: 'back.out(1.8)' });
  }
}
