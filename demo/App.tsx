import React from 'react';
import { BrandGrid } from './components/BrandGrid';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { LogoLab } from './components/LogoLab';
import { useTheme } from './hooks/useTheme';

export function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <main className="mx-auto flex w-full max-w-[883px] flex-col items-center px-6 pb-16 max-sm:px-4 max-sm:pb-12">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <BrandGrid />
      <LogoLab />

      {/* The package is the alternative, not the default. Most people want
          one mark in one state, and for them a file they own beats a
          dependency they have to keep. */}
      <p className="w-full text-[13px] leading-5 text-muted-foreground">
        Using several marks or several states? <code className="font-mono">npm install thinking-logo</code>{' '}
        gives you the whole engine and one copy of it —{' '}
        <a
          className="text-foreground underline-offset-4 hover:underline"
          href="https://github.com/enesozturk/thinking-logo#readme"
        >
          see the README
        </a>
        .
      </p>
      <Footer />
    </main>
  );
}
