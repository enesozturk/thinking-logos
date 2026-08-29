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

/**
 * The variants of one verb, as the pills they ship as.
 *
 * Deliberately not labelled. The seven-state grid names each card because
 * the whole point there is that these are seven different things; here they
 * are one thing done five ways, and a caption reading "Cast" or "Lathe"
 * invites reading the words instead of watching the difference — which is
 * the only place the difference exists.
 */
function VariantPills({
  brand,
  source,
  tint
}: {
  brand: Brand;
  source: { svg: string } | { path: string };
  tint: string;
}) {
  const v = brand.variants!;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      {[v.tunes.slice(0, 2), v.tunes.slice(2, 4), v.tunes.slice(4)].map((row, r) => (
        <div key={r} className="flex justify-center gap-3">
          {row.map((tune, i) => (
            <div
              key={`${r}-${i}`}
              className="flex items-center gap-3 rounded-full border border-border/60 bg-card/50 py-3.5 pr-8 pl-3.5"
            >
              <ThinkingLogo
                logo={source}
                state={v.state}
                size={96}
                tint={tint}
                tune={tune}
                startAtMark
              />
              <span className="text-base leading-none whitespace-nowrap">
                {brand.title}{' '}
                <span className="text-muted-foreground">{v.state.toLowerCase()}…</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CompanyShowcase({ brand }: { brand: Brand }) {
  const source = brand.svg ? { svg: brand.svg } : { path: brand.path };
  const tint = `#${brand.hex}`;

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      {/* One fixed 4:3 stage, pinned by its height. Everything inside is
          sized to it, so what is recorded is what was designed. Height is
          the fixed side because the capture is height-bound; the width
          follows from the ratio (550 × 4/3 ≈ 733). */}
      <div
        data-capture="4x3"
        className="flex aspect-[4/3] h-[550px] max-w-full flex-col rounded-2xl border bg-card px-10 py-8"
      >
        <header className="flex items-baseline justify-between">
          <h1 className="font-heading text-2xl leading-none">{brand.title}</h1>
          <span className="font-heading text-2xl leading-none text-muted-foreground">
            Thinking Logos
          </span>
        </header>

        {/* The marks are the subject, so they take the room. Anything that
            only explains them is a caption competing with them.

            Item width is what keeps four to a row once the stage is pinned
            to 550px tall: at that height the frame is 733px wide, and 168px
            items only fit three across, which strands the seventh alone on
            a third row and overflows the card.

            Wrapping rather than a grid, because seven items in four columns
            leaves the second row three wide — a grid pins those to the left
            and the whole block reads as unfinished, where wrapping centres
            them. And the group is centred in the frame rather than stretched
            to it: a stretched two-row grid pushes its rows apart and opens a
            hole under the title. */}
        {brand.variants ? (
          <VariantPills brand={brand} source={source} tint={tint} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-10">
              {STATES.map(({ state, label }) => (
                <div key={state} className="flex w-[136px] flex-col items-center gap-2.5">
                  <ThinkingLogo logo={source} state={state} size={125} tint={tint} startAtMark />
                  <span className="text-[13px] leading-none text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
