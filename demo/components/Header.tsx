import React from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import { BRAND_BY_KEY } from '../brands';
import type { Theme } from '../hooks/useTheme';
import { GitHubIcon } from './icons';

const iconBtnClass =
  'flex items-center justify-center size-9 border-none rounded-full bg-(--icon-btn-bg) text-inherit cursor-pointer no-underline transition-[background-color] duration-200 [-webkit-tap-highlight-color:transparent] hover:bg-(--icon-btn-hover) focus-visible:outline-2 focus-visible:outline-(--icon-btn-outline) focus-visible:outline-offset-2 [&_svg]:block [&_svg]:shrink-0 [&_svg]:fill-(--icon-btn-fill) [&_svg]:opacity-60 [&_svg]:transition-opacity [&_svg]:duration-200 hover:[&_svg]:opacity-100';

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <header className="relative w-full text-center flex flex-col items-center pt-16 pb-12 max-sm:pt-12 max-sm:pb-8">
      <nav className="absolute top-4 right-0 flex items-center gap-3" aria-label="Links">
        <button
          type="button"
          onClick={onToggleTheme}
          className={`${iconBtnClass} text-[13px] text-(--footer-muted)`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
        <a
          className={iconBtnClass}
          href="https://github.com/enesozturk/thinking-logo"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
        >
          <GitHubIcon />
        </a>
      </nav>

      {/* The hero is the feature, running live: the mark disperses into a
          sphere and reassembles, which is the one thing a static image of
          this library can never show. */}
      <div className="mb-6" aria-hidden="true">
        <ThinkingLogo logo={{ path: BRAND_BY_KEY.stripe.path }} state="thinking" size={112} />
      </div>

      <h1 className="text-[22px] font-medium leading-[30px] text-(--title-color)">thinking-logo</h1>
      <p className="mt-1 max-w-[520px] text-sm font-normal leading-[21px] text-(--subtitle-color) opacity-60">
        Your logo, as the loading state. Bake any SVG into a 3D point cloud and animate it with the
        thinking-orbs engine — it scatters into a sphere while the model works, and reassembles into
        your mark when it is done.
      </p>
    </header>
  );
}
