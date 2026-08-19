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

      <Footer />
    </main>
  );
}
