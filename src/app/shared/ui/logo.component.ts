import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let uid = 0;

/**
 * GloChat brand mark: a chat bubble that is also a delivery pin, with a "G" and a lime "glow" spark.
 * {@code animated} turns it into the loader (pin hops, the G draws itself, the spark pulses) — pure CSS,
 * same keyframes as the boot splash in index.html, disabled under prefers-reduced-motion.
 */
@Component({
  selector: 'mc-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2' },
  template: `
    <span class="relative inline-grid place-items-center" [class.gc-loader]="animated()" [style.width.px]="size()" [style.height.px]="size()">
      @if (animated()) {
        <span class="gc-ripple" aria-hidden="true"></span>
        <span class="gc-shadow" aria-hidden="true"></span>
      }
      <svg viewBox="0 0 48 48" class="gc-mark relative size-full overflow-visible" role="img" [attr.aria-label]="wordmark() ? null : 'GloChat'">
        <defs>
          <linearGradient [attr.id]="'b' + id" x1="9" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#8f73ff" /><stop offset=".55" stop-color="#5b3df5" /><stop offset="1" stop-color="#3a1fc4" />
          </linearGradient>
          <radialGradient [attr.id]="'g' + id" cx="34.5" cy="11.5" r="7" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#e6ff8a" stop-opacity=".95" /><stop offset="1" stop-color="#c8f23b" stop-opacity="0" />
          </radialGradient>
        </defs>
        <path [attr.fill]="'url(#b' + id + ')'" d="M24 3.5c10.2 0 18 7.4 18 17.2 0 9.6-7.6 15.4-15 21.6l-3 2.6-3-2.6C13.6 36.1 6 30.3 6 20.7 6 10.9 13.8 3.5 24 3.5Z" />
        <path fill="#fff" fill-opacity=".14" d="M24 5.5c-8.9 0-15.8 6.3-16 14.8 3.5-6.6 9.4-10.3 16-10.3 3.4 0 6.6.9 9.3 2.6A16.5 16.5 0 0 0 24 5.5Z" />
        <path class="gc-g" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" d="M30.1 15.4A8 8 0 1 0 32 20.5H25" />
        <circle class="gc-spark-glow" cx="34.5" cy="11.5" r="7" [attr.fill]="'url(#g' + id + ')'" />
        <circle class="gc-spark" cx="34.5" cy="11.5" r="2.9" fill="#c8f23b" />
      </svg>
    </span>
    @if (wordmark()) {
      <span class="font-extrabold leading-none tracking-[-0.04em] text-ink" [style.font-size.px]="size() * 0.62" dir="ltr">glo<span class="text-iris-500">chat</span></span>
    }
  `,
})
export class LogoComponent {
  readonly size = input(36);
  readonly wordmark = input(false);
  readonly animated = input(false);
  readonly id = `gc${++uid}`;
}
