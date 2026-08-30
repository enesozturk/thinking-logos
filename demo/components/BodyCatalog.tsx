import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import { BODY_NAMES } from '@/lib/bodies';
import { BRAND_BY_KEY } from '../brands';

/**
 * Every `generating` body at once, numbered.
 *
 * A catalogue rather than a demo: the point is to compare the forms and
 * name the ones worth keeping, so they run on one mark, at one size, on one
 * clock, and each carries its number. Anything that varied between cells
 * would be a reason a cell looked better that has nothing to do with the
 * form.
 */
export function BodyCatalog() {
  const brand = BRAND_BY_KEY.fal;
  const source = brand.svg ? { svg: brand.svg } : { path: brand.path };

  return (
    <main className="mx-auto w-full max-w-[840px] px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="font-heading text-2xl leading-none">Generating — the bodies</h1>
      </header>

      {/* Wrapping and centred rather than a grid: eight cells in threes
          leaves the last row short, and a grid pins those to the left where
          the block reads as unfinished. Three across is the frame this page
          is captured at. */}
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-10">
        {BODY_NAMES.map((name, id) => (
          <div key={name} className="flex w-[230px] flex-col items-center gap-3">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-2">
              <ThinkingLogo
                logo={source}
                state="generating"
                size={196}
                tint={`#${brand.hex}`}
                tune={{ body: id }}
                startAtMark
              />
            </div>
            <div className="text-[13px] leading-none">
              <span className="tabular-nums text-muted-foreground">
                {String(id).padStart(2, '0')}
              </span>{' '}
              {name}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
