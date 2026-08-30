import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import { BODY_NAMES, BODY_NOTES } from '@/lib/bodies';
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
    <main className="mx-auto w-full max-w-[1180px] px-6 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="font-heading text-2xl leading-none">Generating — the bodies</h1>
        <span className="text-[13px] text-muted-foreground">
          one mark, one clock, {BODY_NAMES.length} bodies
        </span>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-6 gap-y-9">
        {BODY_NAMES.map((name, id) => (
          <div key={name} className="flex flex-col items-center gap-2.5">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-2">
              <ThinkingLogo
                logo={source}
                state="generating"
                size={168}
                tint={`#${brand.hex}`}
                tune={{ body: id }}
                startAtMark
              />
            </div>
            <div className="text-center">
              <div className="text-[13px] leading-none">
                <span className="tabular-nums text-muted-foreground">
                  {String(id).padStart(2, '0')}
                </span>{' '}
                {name}
              </div>
              <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
                {BODY_NOTES[id]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
