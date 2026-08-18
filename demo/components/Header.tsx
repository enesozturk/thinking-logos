import React, { useEffect, useState } from 'react';
import { GithubLogoIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import { LOGO_PRESETS, LOGO_STATE_TO_MODE } from '../../src/logoPresets';
import type { LogoState } from '../../src/logoPresets';
import { BRANDS } from '../brands';
import type { Theme } from '../hooks/useTheme';
import { Button, buttonVariants } from '@/components/ui/button';

const VERB_TO_STATE: Record<string, LogoState> = {
  Thinking: 'thinking',
  Solving: 'solving',
  Listening: 'listening',
  Searching: 'searching',
  Working: 'working',
  Breathing: 'breathing',
  Orbiting: 'orbiting'
};

/** How long one full dwell-morph-morph cycle of a state lasts, in seconds. */
function cycleOf(state: LogoState): number {
  const o = LOGO_PRESETS[LOGO_STATE_TO_MODE[state]].opts;
  return (typeof o.dwell === 'number' ? o.dwell : 4) + 2 * (typeof o.morph === 'number' ? o.morph : 1.9);
}

/**
 * Step through the marks, changing at a cycle boundary.
 *
 * A timer on a round number would swap mid-morph — the mark half-formed one
 * frame and a different mark half-formed the next, which reads as a
 * glitch. Every instance runs off one shared clock, so the phase of the
 * incoming state is knowable in advance: schedule the swap for the moment
 * its cycle restarts and the change lands while the working form is
 * showing, where there is nothing recognisable to interrupt.
 */
function useRotatingBrand() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const next = (i + 1) % BRANDS.length;
    const state = VERB_TO_STATE[BRANDS[next].verb] ?? 'thinking';
    const cycle = cycleOf(state);
    const wait = cycle - ((performance.now() / 1000) % cycle);
    const id = setTimeout(() => setI(next), wait * 1000);
    return () => clearTimeout(id);
  }, [i]);

  const brand = BRANDS[i];
  return {
    brand,
    state: VERB_TO_STATE[brand.verb] ?? 'thinking',
    source: brand.svg ? { svg: brand.svg } : { path: brand.path }
  };
}

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { brand, state, source } = useRotatingBrand();

  return (
    <header className="relative flex w-full flex-col items-center pt-16 pb-12 text-center max-sm:pt-12 max-sm:pb-8">
      <nav className="absolute top-4 right-0 flex items-center gap-1" aria-label="Links">
        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </Button>
        {/* An anchor wearing the button's classes rather than a Button
            wrapping an anchor: Base UI composes through `render`, not
            `asChild`, and a link that is really a link keeps middle-click,
            copy-address and the rest working. */}
        <a
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          href="https://github.com/enesozturk/thinking-logo"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
        >
          <GithubLogoIcon />
        </a>
      </nav>

      {/* The hero is the feature, running live, and it cycles through every
          mark and every state — which is the one thing a static image of
          this library can never show. */}
      <div className="mb-6 flex h-28 items-center" aria-hidden="true">
        <ThinkingLogo key={brand.key} logo={source} state={state} size={112} />
      </div>

      <h1 className="font-heading text-3xl leading-tight">thinking-logo</h1>
      <p className="mt-2 max-w-[440px] text-sm leading-[21px] text-muted-foreground">
        Your logo, as the loading state. Bake any SVG into a 3D point cloud and animate it.
      </p>
    </header>
  );
}
