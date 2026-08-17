import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import type { LogoState } from '../../src/logoPresets';
import type { Brand } from '../brands';
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

/**
 * Card height and pill scale, per mark. Hand-set rather than derived.
 *
 * A masonry of equal cards is just a grid. The uneven heights are the whole
 * effect: each pill has to read as one thing floating in a space of its
 * own, which only works if the spaces differ enough to be obviously
 * deliberate. Mixing full pills with small chips does the same job at the
 * component level, and doubles as a check that the marks survive being
 * shrunk — which is the size they actually ship at.
 */
const LAYOUT: Record<string, { h: number; chip?: boolean }> = {
  anthropic: { h: 300 },
  supabase: { h: 190, chip: true },
  stripe: { h: 248 },
  linear: { h: 186, chip: true },
  spotify: { h: 292 },
  github: { h: 200, chip: true },
  shopify: { h: 236 }
};

function Pill({ brand, tinted, chip }: { brand: Brand; tinted: boolean; chip: boolean }) {
  const state = VERB_TO_STATE[brand.verb] ?? 'thinking';
  const tint = tinted ? `#${brand.hex}` : undefined;

  if (chip) {
    return (
      <div className="inline-flex items-center gap-2 h-9 pl-1.5 pr-3.5 rounded-full bg-(--chip-bg) shadow-(--chip-shadow)">
        <ThinkingLogo logo={{ path: brand.path }} state={state} size={24} tint={tint} />
        <span className="text-[13px] leading-none text-(--chip-color) whitespace-nowrap">
          {brand.title} <span className="opacity-55">{brand.verb.toLowerCase()}…</span>
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 h-[68px] pl-3 pr-7 rounded-full bg-(--pill-bg) border border-(--pill-border) shadow-(--pill-shadow)">
      <ThinkingLogo logo={{ path: brand.path }} state={state} size={44} tint={tint} />
      <span className="text-[15px] leading-none text-(--pill-fg) whitespace-nowrap">
        {brand.title} <span className="opacity-45">{brand.verb.toLowerCase()}…</span>
      </span>
    </div>
  );
}

export function BrandGrid({ tinted, onToggleTint }: { tinted: boolean; onToggleTint: () => void }) {
  return (
    <section className="w-full mb-10" aria-label="Brand examples">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-normal leading-[34px] text-(--section-title-color)">
          Seven marks, seven states
        </h2>
        <button
          type="button"
          onClick={onToggleTint}
          aria-pressed={tinted}
          className="h-8 px-3 rounded-full text-[13px] bg-(--toggle-bg) text-(--toggle-color) hover:bg-(--toggle-hover) hover:text-(--toggle-hover-color) transition-colors cursor-pointer"
        >
          {tinted ? 'Brand colour' : 'Monochrome'}
        </button>
      </div>

      {/* CSS multi-column rather than a grid: it is the one layout primitive
          that packs items of differing heights without measuring them, so
          the cards can be any size and the columns still balance. */}
      <div className="columns-2 gap-3 max-sm:columns-1">
        {BRANDS.map((b) => {
          const l = LAYOUT[b.key] ?? { h: 220 };
          return (
            <div
              key={b.key}
              style={{ height: l.h }}
              className="mb-3 break-inside-avoid flex items-center justify-center rounded-2xl bg-(--surface) max-sm:!h-[180px]"
            >
              <Pill brand={b} tinted={tinted} chip={!!l.chip} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
