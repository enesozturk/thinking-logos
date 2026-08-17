import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import type { LogoState } from '../../src/logoPresets';
import { BRANDS } from '../brands';

// The grid's real job: show that these are seven distinct MOTIONS on the
// same kind of object, not one animation with seven labels.
const VERB_TO_STATE: Record<string, LogoState> = {
  Thinking: 'thinking',
  Solving: 'solving',
  Listening: 'listening',
  Searching: 'searching',
  Working: 'working',
  Breathing: 'breathing',
  Orbiting: 'orbiting'
};

const BIG = 80;
const SMALL = 60;

/**
 * Card height and mark size, per brand. Hand-set rather than derived.
 *
 * A masonry of equal cards is just a grid. The uneven heights are the whole
 * effect: each mark has to read as one thing floating in a space of its
 * own, which only works if the spaces differ enough to be obviously
 * deliberate. The two mark sizes do the same job, and double as a check
 * that a shape still reads once it is shrunk.
 */
const LAYOUT: Record<string, { h: number; sm?: boolean }> = {
  anthropic: { h: 300 },
  supabase: { h: 190, sm: true },
  x: { h: 248 },
  linear: { h: 186, sm: true },
  spotify: { h: 292 },
  github: { h: 200, sm: true },
  shopify: { h: 236 }
};

export function BrandGrid() {
  return (
    <section className="w-full mb-10" aria-label="Brand examples">
      {/* CSS multi-column rather than a grid: it is the one layout primitive
          that packs items of differing heights without measuring them, so
          the cards can be any size and the columns still balance. */}
      <div className="columns-2 gap-3 max-sm:columns-1">
        {BRANDS.map((b) => {
          const l = LAYOUT[b.key] ?? { h: 220 };
          const size = l.sm ? SMALL : BIG;
          const source = b.svg ? { svg: b.svg } : { path: b.path };
          return (
            <div
              key={b.key}
              style={{ height: l.h }}
              className="mb-3 break-inside-avoid flex flex-col items-center justify-center gap-3 rounded-2xl bg-(--surface) max-sm:!h-[200px]"
            >
              <ThinkingLogo
                logo={source}
                state={VERB_TO_STATE[b.verb] ?? 'thinking'}
                size={size}
                tint={`#${b.hex}`}
              />
              <span className="text-[13px] leading-none text-(--chip-color)">
                {b.title} <span className="opacity-50">{b.verb.toLowerCase()}…</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
