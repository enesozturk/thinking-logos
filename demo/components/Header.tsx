import React from 'react';
import { GithubLogoIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import type { Theme } from '../hooks/useTheme';
import { StaticMark } from './StaticMark';
import { Button, buttonVariants } from '@/components/ui/button';

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
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

      <div className="mb-6" aria-hidden="true">
        <StaticMark />
      </div>

      <h1 className="font-heading text-3xl leading-tight">thinking-logo</h1>
      <p className="mt-2 max-w-[440px] text-sm leading-[21px] text-muted-foreground">
        Your logo, as the loading state. Bake any SVG into a 3D point cloud and animate it.
      </p>
    </header>
  );
}
