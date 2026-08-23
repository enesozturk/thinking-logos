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
  Waiting: 'waiting',
  Generating: 'generating'
};

const MARK = 48;

export function BrandGrid() {
  return (
    <section className="mb-10 w-full" aria-label="Brand examples">
      {/* Pills rather than cards on a masonry.
          
          The masonry gave each mark a large empty room of its own, which
          reads as a gallery — seven pieces to be looked at one at a time.
          These are loading indicators; they belong in a row of chips, at the
          size and in the shape they will actually ship in. Wrapping rather
          than a grid so the short last row centres instead of hanging left. */}
      <div className="flex flex-wrap justify-center gap-3">
        {BRANDS.map((b) => (
          <div
            key={b.key}
            className="flex items-center gap-3 rounded-full border bg-card py-2 pr-6 pl-2"
          >
            <ThinkingLogo
              logo={b.svg ? { svg: b.svg } : { path: b.path }}
              state={VERB_TO_STATE[b.verb] ?? 'thinking'}
              size={MARK}
              tint={`#${b.hex}`}
            />
            <span className="text-[15px] leading-none whitespace-nowrap">
              {b.title} <span className="text-muted-foreground">{b.verb.toLowerCase()}…</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
