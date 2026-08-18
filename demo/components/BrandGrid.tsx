import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import type { LogoState } from '../../src/logoPresets';
import { BRANDS } from '../brands';
import { Card } from '@/components/ui/card';

// The grid's real job: show that these are seven distinct MOTIONS on the
// same kind of object, not one animation with seven labels.
const VERB_TO_STATE: Record<string, LogoState> = {
  Thinking: 'thinking',
  Solving: 'solving',
  Listening: 'listening',
  Searching: 'searching',
  Breathing: 'breathing',
  Orbiting: 'orbiting'
};

const MARK = 100;

/**
 * Card height and mark size, per brand. Hand-set rather than derived.
 *
 * A masonry of equal cards is just a grid. The uneven heights are the whole
 * effect: each mark has to read as one thing floating in a space of its
 * own, which only works if the spaces differ enough to be obviously
 * deliberate. The marks themselves are all one size — varying those made
 * the set look like a comparison rather than a collection.
 */
const LAYOUT: Record<string, number> = {
  claude: 288,
  x: 254,
  supabase: 226,
  linear: 214,
  spotify: 276,
  github: 236
};

export function BrandGrid() {
  return (
    <section className="mb-10 w-full" aria-label="Brand examples">
      {/* CSS multi-column rather than a grid: it is the one layout primitive
          that packs items of differing heights without measuring them, so
          the cards can be any size and the columns still balance. */}
      <div className="columns-2 gap-3 max-sm:columns-1">
        {BRANDS.map((b) => {
          const source = b.svg ? { svg: b.svg } : { path: b.path };
          return (
            <Card
              key={b.key}
              style={{ height: LAYOUT[b.key] ?? 240 }}
              className="mb-3 flex break-inside-avoid items-center justify-center gap-3 max-sm:!h-[200px]"
            >
              <ThinkingLogo
                logo={source}
                state={VERB_TO_STATE[b.verb] ?? 'thinking'}
                size={MARK}
                tint={`#${b.hex}`}
              />
              <span className="text-[13px] leading-none text-muted-foreground">
                <span className="text-foreground">{b.title}</span> {b.verb.toLowerCase()}…
              </span>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
