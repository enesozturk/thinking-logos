import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/**
 * Drives both theme conventions at once.
 *
 * shadcn's tokens are scoped to a `.dark` class; `ThinkingLogo` resolves its
 * substrate from a `data-theme` attribute or that same class. Setting both
 * keeps the page and the canvas in agreement — the one bug that would be
 * invisible until a light-mode viewer sees white dots on a white card.
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return [theme, toggle];
}
