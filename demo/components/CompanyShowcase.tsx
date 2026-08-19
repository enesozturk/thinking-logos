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
        className="flex aspect-[4/3] w-full max-w-[940px] flex-col rounded-2xl border bg-card p-10"
      >
        <header className="flex items-baseline justify-between">
          <h1 className="font-heading text-3xl leading-none">{brand.title}</h1>
          <p className="text-[13px] text-muted-foreground">
            every state, rendered from {brand.title}&rsquo;s own mark
          </p>
        </header>

        <div className="flex flex-1 items-center">
          <div className="grid w-full grid-cols-4 gap-x-4 gap-y-10 max-sm:grid-cols-3">
          {STATES.map(({ state, label }) => (
            <div key={state} className="flex flex-col items-center gap-2">
              <ThinkingLogo logo={source} state={state} size={96} tint={tint} />
              <span className="text-[13px] leading-none text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <span className="font-heading text-lg leading-none">thinking-logo</span>
            <span className="text-[12px] leading-none text-muted-foreground">
              your logo, as the loading state
            </span>
            </div>
          </div>
        </div>

        <footer className="text-[12px] text-muted-foreground">
          github.com/enesozturk/thinking-logo
        </footer>
      </div>
    </main>
  );
}
