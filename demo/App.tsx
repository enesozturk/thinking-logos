import React, { useState } from 'react';
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
    <section className="w-full mb-6" aria-label={title}>
      <h2 className="text-base font-normal leading-[34px] text-(--section-title-muted) mb-1">{title}</h2>
      <div className="flex items-start bg-(--code-bg) rounded-[10px] py-1.5 pr-10 pl-3 overflow-hidden relative">
        <code className="font-[Roboto_Mono,monospace] text-sm leading-[22px] text-(--code-text) whitespace-pre overflow-x-auto min-w-0 flex-1">
          {code}
        </code>
        <CopyButton getText={() => code} />
      </div>
    </section>
  );
}

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [tinted, setTinted] = useState(true);

  return (
    <main className="flex flex-col items-center max-w-[883px] mx-auto w-full px-6 pb-16 max-sm:px-4 max-sm:pb-12">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <BrandGrid tinted={tinted} speed={1} onToggleTint={() => setTinted((v) => !v)} />
      <LogoLab />
      <CodeBlock title="Installation" code={INSTALL} />
      <CodeBlock title="Usage" code={USAGE} />
      <CodeBlock title="Bake at build time" code={PREBAKED} />
      <Footer />
    </main>
  );
}
