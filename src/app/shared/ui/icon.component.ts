import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Line icons (24 px grid, 1.8 stroke, round caps) — original GloChat set, inherit the text colour. */
const LINE: Record<string, string> = {
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z M12 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z',
  scooter: 'M3.5 17a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0Z M15.5 17a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0Z M8.5 17h7 M18 14.5 16 6h-2.5 M16.6 9.5h-6.1l-2 4.6 M3 10.5h5.5',
  clock: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z M12 7.5V12l3 2',
  cash: 'M4.5 6h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z M12 9.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z M6 9.5v5 M18 9.5v5',
  card: 'M5 5.5h14a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 16V8A2.5 2.5 0 0 1 5 5.5Z M2.5 10h19 M6.5 15h3',
  alert: 'M10.3 4.2 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z M12 9.5v4 M12 17h.01',
  lock: 'M7.5 10.5h9a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18v-5a2.5 2.5 0 0 1 2.5-2.5Z M8 10.5V8a4 4 0 0 1 8 0v2.5 M12 14.5v2',
  store: 'M4 9.5 5.5 4h13L20 9.5 M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0 M5.5 12.2V20h13v-7.8 M10 20v-4.5h4V20',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  check: 'M5 12.5 9.5 17 19 7.5',
  'check-circle': 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z M8.2 12.3l2.6 2.6 5-5.2',
  'x-circle': 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z M9.2 9.2l5.6 5.6 M14.8 9.2l-5.6 5.6',
  'wifi-off': 'M2 8.8a15 15 0 0 1 4.2-2.6 M10.7 5.1A15 15 0 0 1 22 8.8 M5.2 12.3a10 10 0 0 1 5.5-2.7 M15.8 10.4a10 10 0 0 1 3 1.9 M8.6 15.6a5 5 0 0 1 6.8 0 M12 19.5h.01 M3 3l18 18',
  cloche: 'M3 17.5h18 M4.8 17.5a7.2 7.2 0 0 1 14.4 0 M12 10.3V8.6 M10.4 8.6h3.2 M4 20.5h16',
  chef: 'M7 14.5V20h10v-5.5 M7 14.5a4 4 0 0 1-1.2-7.8A4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 6.2 2.7A4 4 0 0 1 17 14.5Z M7 17h10',
  flame: 'M12 21c3.9 0 7-2.7 7-6.6 0-3.2-2-5.2-3.6-7.1-.3 1.8-1.1 3-2.4 3.7.2-3.4-1.3-6.2-4-8-.2 3-1.7 4.8-3.1 6.4C4.7 10.9 5 12.5 5 14.4 5 18.3 8.1 21 12 21Z',
  'home-check': 'M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11Z M9 14.8l2.1 2.1 4-4.2',
  receipt: 'M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21V3Z M9 8h6 M9 12h6 M9 16h3',
  bag: 'M5 8h14l-1 12.5H6L5 8Z M9 8V6.5a3 3 0 0 1 6 0V8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 20.5c.8-3.6 3.9-6 7.5-6s6.7 2.4 7.5 6',
};

/**
 * {@code <mc-icon name="scooter" />}: line icons for the interface, plus two-tone food category icons
 * (burger, sushi, salad, cake, tajine, coffee). Decorative by default (aria-hidden).
 */
@Component({
  selector: 'mc-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0 align-[-0.15em]', 'aria-hidden': 'true' },
  template: `
    @if (path(); as d) {
      <svg viewBox="0 0 24 24" class="size-full" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()"
           stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="d" /></svg>
    } @else {
      @switch (name()) {
        @case ('burger') {
          <svg viewBox="0 0 24 24" class="size-full">
            <path fill="#f6a03c" d="M4 10.5C4 6.9 7.6 4.5 12 4.5s8 2.4 8 6H4Z" />
            <path fill="#fff" opacity=".85" d="M9 7.4h1.2M12.4 6.6h1.2M14.8 8h1.2" stroke="#fff" stroke-width="1.1" stroke-linecap="round" />
            <path fill="none" stroke="#3fbf5a" stroke-width="1.8" stroke-linecap="round" d="M3.5 12.3c1.4 1 2.6-1 4.1 0s2.6-1 4.1 0 2.6-1 4.1 0 2.6-1 4.2 0" />
            <rect x="4" y="13.6" width="16" height="3" rx="1.5" fill="#7a3e1d" />
            <path fill="#f6a03c" d="M4.5 17.6h15a2.4 2.4 0 0 1-2.4 2.4H6.9a2.4 2.4 0 0 1-2.4-2.4Z" />
          </svg>
        }
        @case ('sushi') {
          <svg viewBox="0 0 24 24" class="size-full">
            <rect x="3.5" y="8.5" width="17" height="10" rx="5" fill="#fff" stroke="#e7e3da" stroke-width="1" />
            <rect x="3.5" y="12" width="17" height="3.2" fill="#24322e" />
            <path fill="#ff7a59" d="M4.6 10.2C6.2 6.4 17.8 6.4 19.4 10.2c-4.6 1.4-10.2 1.4-14.8 0Z" />
            <path fill="none" stroke="#ffd2c4" stroke-width="1" stroke-linecap="round" d="M8.4 8.2 9.4 10M11.6 7.6l.8 2.4M14.8 7.9l-.6 2.2" />
          </svg>
        }
        @case ('salad') {
          <svg viewBox="0 0 24 24" class="size-full">
            <circle cx="8.5" cy="9.5" r="3.2" fill="#7ed957" /><circle cx="13" cy="8" r="3.4" fill="#3fbf5a" />
            <circle cx="16.4" cy="10" r="2.6" fill="#ff5a4e" /><circle cx="11" cy="10.6" r="1.6" fill="#ffd43b" />
            <path fill="#5b3df5" d="M3 11.5h18a9 9 0 0 1-18 0Z" />
            <path fill="#8f73ff" d="M5 12.6h14a7 7 0 0 1-1 2.6H6a7 7 0 0 1-1-2.6Z" opacity=".55" />
          </svg>
        }
        @case ('cake') {
          <svg viewBox="0 0 24 24" class="size-full">
            <path fill="#ffe3ef" d="M4 19.5V12l15.5-5v12.5H4Z" />
            <path fill="#ff8fb8" d="M4 12 19.5 7v3.2L4 15.2V12Z" />
            <path fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" d="M5 17h13.5" />
            <circle cx="16.5" cy="5.6" r="2" fill="#e5384f" /><path fill="none" stroke="#3fbf5a" stroke-width="1.2" stroke-linecap="round" d="M16.8 3.7c.6-.9 1.6-1.2 2.4-1" />
          </svg>
        }
        @case ('tajine') {
          <svg viewBox="0 0 24 24" class="size-full">
            <path fill="#e9874d" d="M12 3.2c-.9 0-1.5.6-1.5 1.4v.5L5.2 13h13.6l-5.3-7.9v-.5c0-.8-.6-1.4-1.5-1.4Z" />
            <path fill="#ffb27d" d="M10.6 6.1h2.8L15.7 9.5H8.3l2.3-3.4Z" opacity=".7" />
            <path fill="#b9502a" d="M2.8 13.5h18.4c0 2.6-2.1 4.7-4.7 4.7H7.5c-2.6 0-4.7-2.1-4.7-4.7Z" />
            <path fill="#16131f" opacity=".12" d="M6 19.5h12" stroke="#16131f" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        }
        @case ('coffee') {
          <svg viewBox="0 0 24 24" class="size-full">
            <path fill="none" stroke="#c9bcff" stroke-width="1.5" stroke-linecap="round" d="M8.5 3.5c-.8 1 .8 1.6 0 2.6M12 3.5c-.8 1 .8 1.6 0 2.6" />
            <path fill="#8b5a3c" d="M4.5 8.5h11v5.3a5.5 5.5 0 0 1-11 0V8.5Z" />
            <path fill="none" stroke="#8b5a3c" stroke-width="1.8" d="M15.5 10.2h1.4a2.2 2.2 0 0 1 0 4.4h-1.6" />
            <path fill="#c99a76" d="M6 9.8h8v1.2H6z" />
            <path fill="#16131f" opacity=".1" d="M3.5 20.2h14v.8h-14z" />
          </svg>
        }
      }
    }
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly stroke = input(1.8);
  readonly path = computed(() => LINE[this.name()] ?? null);
}
