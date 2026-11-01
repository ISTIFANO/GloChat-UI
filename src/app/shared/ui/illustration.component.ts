import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let uid = 0;

/** Brand illustrations (original SVG, GloChat palette) used for empty states. */
@Component({
  selector: 'mc-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    @switch (name()) {
      @case ('bag') {
        <svg viewBox="0 0 160 140" class="size-full" aria-hidden="true">
          <defs>
            <linearGradient [attr.id]="'bg' + id" x1="40" y1="40" x2="120" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#8f73ff" /><stop offset="1" stop-color="#4a2be0" />
            </linearGradient>
            <linearGradient [attr.id]="'bs' + id" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#efeaff" /><stop offset="1" stop-color="#f7f5f0" stop-opacity="0" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="128" rx="46" ry="7" fill="#16131f" opacity=".08" />
          <circle cx="80" cy="70" r="62" [attr.fill]="'url(#bs' + id + ')'" />
          <!-- bag -->
          <path d="M46 52h68l6 66a8 8 0 0 1-8 9H48a8 8 0 0 1-8-9l6-66Z" [attr.fill]="'url(#bg' + id + ')'" />
          <path d="M46 52h68l1 10H45l1-10Z" fill="#fff" opacity=".14" />
          <path d="M62 60V46a18 18 0 0 1 36 0v14" fill="none" stroke="#16131f" stroke-width="6" stroke-linecap="round" />
          <circle cx="62" cy="62" r="4" fill="#16131f" /><circle cx="98" cy="62" r="4" fill="#16131f" />
          <!-- smile -->
          <path d="M68 92c4 6 20 6 24 0" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" />
          <!-- lime tag + sparkles -->
          <g transform="rotate(-14 120 46)">
            <rect x="106" y="34" width="34" height="22" rx="7" fill="#c8f23b" />
            <circle cx="113" cy="45" r="3" fill="#16131f" />
            <path d="M120 41h13M120 49h9" stroke="#16131f" stroke-width="2.6" stroke-linecap="round" />
          </g>
          <path d="M30 34l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#c8f23b" />
          <path d="M132 92l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2 2-4.5Z" fill="#8f73ff" />
        </svg>
      }
      @case ('receipt') {
        <svg viewBox="0 0 160 140" class="size-full" aria-hidden="true">
          <ellipse cx="80" cy="128" rx="40" ry="6" fill="#16131f" opacity=".08" />
          <circle cx="80" cy="70" r="60" fill="#efeaff" />
          <path d="M52 22h56a6 6 0 0 1 6 6v94l-9-6-9 6-9-6-9 6-9-6-9 6-9-6V28a6 6 0 0 1 6-6Z" fill="#fff" stroke="#16131f" stroke-width="3" />
          <path d="M60 44h40M60 58h40M60 72h26" stroke="#c9bcff" stroke-width="6" stroke-linecap="round" />
          <circle cx="102" cy="96" r="16" fill="#5b3df5" />
          <path d="M95 96l5 5 9-10" fill="none" stroke="#c8f23b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
    }
  `,
})
export class IllustrationComponent {
  readonly name = input.required<'bag' | 'receipt'>();
  readonly id = `il${++uid}`;
}
