import React from 'react';
import { BrandGrid } from './components/BrandGrid';
import { CopyButton } from './components/CopyButton';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { LogoLab } from './components/LogoLab';
import { useTheme } from './hooks/useTheme';

const INSTALL = 'npm install thinking-logo';

const USAGE = `import { ThinkingLogo } from 'thinking-logo';

<ThinkingLogo logo={{ svg: mySvg }} state="thinking" size={64} />`;

const PREBAKED = `// Production: bake once, ship JSON, never load a rasteriser.
import { bakeLogo, serializeLogo } from 'thinking-logo/bake';
const set = await bakeLogo({ svg }, { count: 300, shell: 'dome' });
writeFileSync('logo.json', serializeLogo(set));

// then, at runtime
import points from './logo.json';
<ThinkingLogo logo={deserializeLogo(points)} state="thinking" />`;

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <section className="mb-6 w-full" aria-label={title}>
      <h2 className="mb-1 text-base leading-[34px] text-muted-foreground">{title}</h2>
      <div className="relative flex items-start overflow-hidden rounded-lg bg-muted py-1.5 pr-12 pl-3">
        <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm leading-[22px] whitespace-pre">
          {code}
        </code>
        <CopyButton className="absolute top-1 right-1" getText={() => code} />
      </div>
    </section>
  );
}

export function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <main className="mx-auto flex w-full max-w-[883px] flex-col items-center px-6 pb-16 max-sm:px-4 max-sm:pb-12">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <BrandGrid />
      <LogoLab />
      <CodeBlock title="Installation" code={INSTALL} />
      <CodeBlock title="Usage" code={USAGE} />
      <CodeBlock title="Bake at build time" code={PREBAKED} />
      <Footer />
    </main>
  );
}
