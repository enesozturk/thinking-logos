import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import type { LogoState } from '../../src/logoPresets';
import { BRAND_BY_KEY } from '../brands';

// The grid's real job: show that these are seven distinct MOTIONS on the
// same kind of object, not one animation with seven labels.
const VERB_TO_STATE: Record<string, LogoState> = {
  Thinking: 'thinking',
  Solving: 'solving',
  Listening: 'listening',
  Searching: 'searching',
  Working: 'working',
  Waiting: 'waiting',
  Generating: 'generating'
};

// Large enough that the form is legible at a glance — the point of the
// section is that these are seven different shapes, and at chip size that
// difference is exactly what goes first.
const MARK = 76;

/**
 * Rows, set by hand rather than left to wrap.
 *
 * Wrapping packs by width, so the rows come out however the labels happen
 * to measure — and "Supabase waiting…" against "X working…" is a three-to-one
 * difference in length. Naming the rows lets them be balanced: short beside
 * short, and the wider row in the middle where it reads as the centre of a
 * block rather than as an overflow.
 */
const ROWS: string[][] = [
  ['claude', 'supabase'],
  ['linear', 'github', 'fal'],
  ['spotify', 'x']
];

export function BrandGrid() {
  return (
    <section className="mb-10 w-full" aria-label="Brand examples">
      {/* Pills rather than cards on a masonry.

          The masonry gave each mark a large empty room of its own, which
          reads as a gallery — seven pieces to be looked at one at a time.
          These are loading indicators; they belong in a row of chips, at the
          size and in the shape they will actually ship in. */}
      <div className="flex flex-col items-center gap-3">
        {ROWS.map((row) => (
          <div key={row.join()} className="flex flex-wrap justify-center gap-3">
            {row.map((key) => {
              const b = BRAND_BY_KEY[key];
              if (!b) return null;
              return (
                <div
                  key={b.key}
                  // Barely lifted off the page and outlined in a hairline:
                  // the marks are the only thing here that should carry
                  // contrast, and a solid card competes with them.
                  className="flex items-center gap-3 rounded-full border border-border/60 bg-card/50 py-3.5 pr-8 pl-3.5"
                >
                  <ThinkingLogo
                    logo={b.svg ? { svg: b.svg } : { path: b.path }}
                    state={VERB_TO_STATE[b.verb] ?? 'thinking'}
                    size={MARK}
                    tint={`#${b.hex}`}
                  />
                  <span className="text-base leading-none whitespace-nowrap">
                    {b.title} <span className="text-muted-foreground">{b.verb.toLowerCase()}…</span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
