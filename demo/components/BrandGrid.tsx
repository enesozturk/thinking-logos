import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import type { LogoState } from '../../src/logoPresets';
import type { Brand } from '../brands';
import { BRANDS } from '../brands';

// The grid's real job: show that these are ten distinct MOTIONS on the
// same kind of object, not one animation with ten labels.
const VERB_TO_STATE: Record<string, LogoState> = {
  Thinking: 'thinking',
  Solving: 'solving',
  Listening: 'listening',
  Searching: 'searching',
  Working: 'working',
  Breathing: 'breathing',
  Orbiting: 'orbiting'
};

const WEIGHT_LABEL: Record<Brand['weight'], string> = {
  simple: 'simple mark',
  medium: 'medium detail',
  busy: 'busy mark'
};

function Pill({ brand, tinted, speed }: { brand: Brand; tinted: boolean; speed: number }) {
  return (
    <div
      className="flex items-center gap-3 h-[68px] pl-3 pr-6 rounded-full bg-(--pill-bg) border border-(--pill-border) shadow-(--pill-shadow)"
      title={`${brand.title} — ${WEIGHT_LABEL[brand.weight]}`}
    >
      <ThinkingLogo
        logo={{ path: brand.path }}
        state={VERB_TO_STATE[brand.verb] ?? 'thinking'}
        size={44}
        speed={speed}
        tint={tinted ? `#${brand.hex}` : undefined}
      />
      <div className="min-w-0">
        <div className="text-[15px] leading-5 text-(--pill-fg) truncate">
          {brand.title} <span className="opacity-45">{brand.verb.toLowerCase()}…</span>
        </div>
        <div className="text-[11px] leading-4 text-(--footer-muted)">{WEIGHT_LABEL[brand.weight]}</div>
      </div>
    </div>
  );
}

export function BrandGrid({
  tinted,
  speed,
  onToggleTint
}: {
  tinted: boolean;
  speed: number;
  onToggleTint: () => void;
}) {
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
      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {BRANDS.map((b) => (
          <Pill key={b.key} brand={b} tinted={tinted} speed={speed} />
        ))}
      </div>
      {/* Said plainly rather than buried in the README: the sampler cannot
          rescue a mark that has more detail than the pixels can hold, and a
          demo that hides that sets everyone up for disappointment. */}
      <p className="mt-3 text-[13px] leading-5 text-(--footer-muted)">
        The last two are the honest part — the busier a mark, the fewer of its details survive at
        44px. Bake at the size you ship and judge it there.
      </p>
    </section>
  );
}
