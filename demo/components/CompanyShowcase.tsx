import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import type { LogoState } from '../../src/logoPresets';
import type { Brand } from '../brands';

/**
 * Every state, one mark, framed 4:3 for screen recording.
 *
 * The aspect ratio is the requirement, not a preference: this exists to be
 * captured and posted, and a recording cropped from a page that reflows is
 * a recording that has to be redone. So the frame is fixed and the grid is
 * sized to fill it at one scale.
 */
const STATES: { state: LogoState; label: string }[] = [
  { state: 'thinking', label: 'Thinking' },
  { state: 'searching', label: 'Searching' },
  { state: 'solving', label: 'Solving' },
  { state: 'listening', label: 'Listening' },
  { state: 'working', label: 'Working' },
  { state: 'generating', label: 'Generating' },
  { state: 'waiting', label: 'Waiting' }
];

export function CompanyShowcase({ brand }: { brand: Brand }) {
  const source = brand.svg ? { svg: brand.svg } : { path: brand.path };
  const tint = `#${brand.hex}`;

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      {/* One fixed 4:3 stage. Everything inside is sized to it, so what is
          recorded is what was designed. */}
      <div
        data-capture="4x3"
        className="flex aspect-[4/3] w-full max-w-[880px] flex-col rounded-2xl border bg-card px-10 py-8"
      >
        <header className="flex items-baseline justify-between">
          <h1 className="font-heading text-2xl leading-none">{brand.title}</h1>
          <span className="font-heading text-sm leading-none text-muted-foreground">
            thinking-logo
          </span>
        </header>

        {/* The marks are the subject, so they take the room. Anything that
            only explains them is a caption competing with them.

            Wrapping rather than a grid, because seven items in four columns
            leaves the second row three wide — a grid pins those to the left
            and the whole block reads as unfinished, where wrapping centres
            them. And the group is centred in the frame rather than stretched
            to it: a stretched two-row grid pushes its rows apart and opens a
            hole under the title. */}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-10">
            {STATES.map(({ state, label }) => (
              <div key={state} className="flex w-[168px] flex-col items-center gap-2.5">
                <ThinkingLogo logo={source} state={state} size={132} tint={tint} />
                <span className="text-[13px] leading-none text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-[12px] leading-none text-muted-foreground">
          github.com/enesozturk/thinking-logo
        </footer>
      </div>
    </main>
  );
}
