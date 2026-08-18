// A review harness, not a demo page.
//
// Every state here is a moving thing, and a screenshot of a moving thing
// tells you almost nothing — the `thinking` cycle in particular spends its
// most interesting second mid-flight between sphere and mark, which no
// single frame catches. So this drives the engine directly at FIXED times
// rather than off a clock, and lays the results out as a filmstrip.
//
// Driving `frame(size, t, ...)` by hand like this is also the cheapest
// possible proof that the geometry is a pure function of time: the same t
// renders the same picture, every reload, on any machine.

import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { bakeLogo } from '../src/bake/bake';
import type { LogoPointSet } from '../src/engine/cloud';
import { paintFrame } from '../src/engine/core';
import { adaptTint, paintFrameTinted, parseTint } from '../src/engine/tint';
import type { LogoState } from '../src/logoPresets';
import { resolveLogo } from '../src/logoPresets';
import { BRAND_BY_KEY } from './brands';
import './tailwind.css';

const CELL = 96;

/** One still, rendered at an exact point in the state's own timeline. */
function Still({
  points,
  state,
  t,
  tint
}: {
  points: LogoPointSet;
  state: LogoState;
  t: number;
  tint?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = 2;
    c.width = CELL * dpr;
    c.height = CELL * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const { frame, speed, opts, binding } = resolveLogo(state, points);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CELL, CELL);
    const f = frame(CELL, t * speed, opts, binding);
    const rgb = tint ? parseTint(tint) : null;
    if (rgb) paintFrameTinted(ctx, f, true, adaptTint(rgb, true));
    else paintFrame(ctx, f, true);
  }, [points, state, t, tint]);
  return <canvas ref={ref} style={{ width: CELL, height: CELL, display: 'block' }} />;
}

function Strip({
  points,
  state,
  times,
  note,
  tint
}: {
  points: LogoPointSet;
  state: LogoState;
  times: number[];
  note: string;
  tint?: string;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h2 style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>{state}</h2>
        <span style={{ fontSize: 12, color: 'rgba(251,251,251,0.4)' }}>{note}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {times.map((t) => (
          <div key={t} style={{ background: 'rgba(217,217,217,0.04)', borderRadius: 12, padding: 2 }}>
            <Still points={points} state={state} t={t} tint={tint} />
            <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(251,251,251,0.3)', paddingBottom: 3 }}>
              {t.toFixed(1)}s
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [points, setPoints] = React.useState<LogoPointSet | null>(null);
  const [cube, setCube] = React.useState<LogoPointSet | null>(null);
  useEffect(() => {
    void bakeLogo({ path: BRAND_BY_KEY.linear.path }, { count: 300, shell: 'dome' }).then(setPoints);
    // GitHub's mark is the hard case: busy enough that any motion which
    // mangles the silhouette is immediately obvious.
    void bakeLogo({ path: BRAND_BY_KEY.github.path }, { count: 300, shell: 'dome' }).then(setCube);
  }, []);
  if (!points || !cube) return <div style={{ color: '#888', padding: 40 }}>baking…</div>;

  const tint = `#${BRAND_BY_KEY.linear.hex}`;
  // The assemble cycle is 6.5s: churn to 2.1, rise to 3.25, hold to 5.55,
  // fall out. Sampled unevenly on purpose — the transitions deserve more
  // frames than the holds do.
  const assemble = [0, 2.0, 4.0, 4.8, 5.4, 5.9, 6.4, 7.0, 7.8];
  // The same instant of the hold, four cycles apart. If the mark is not
  // pixel-identical across these, the spin is not landing face-on and the
  // logo is being shown at an angle it should never be shown at.
  const holds = [6.05, 14.2, 22.35, 30.5, 38.65];
  // Dense sampling of the rise. Every frame in which the mark is legible
  // at all must be square to the viewer — that is the whole test.
  const rise = [3.9, 4.2, 4.5, 4.8, 5.1, 5.4, 5.7, 6.0, 6.4];
  const solve = [0, 1.8, 3.6, 5.2, 6.2, 6.9, 7.5, 8.2, 9.0];
  const even = [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8];
  const globe = [0, 2.0, 4.0, 4.9, 5.5, 6.0, 6.5, 7.1, 7.8];
  const meter = [0, 2.0, 4.0, 4.9, 5.5, 6.0, 6.5, 7.1, 7.8];
  // Dense sampling inside the dwell, where the scan band is travelling.
  const sweep = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2];

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 64px' }}>
      <h1 style={{ fontSize: 20, color: '#fff', marginBottom: 4 }}>Cycle filmstrip — Linear mark</h1>
      <p style={{ fontSize: 13, color: 'rgba(251,251,251,0.45)', marginBottom: 24 }}>
        Engine driven at fixed times, not off a clock. Same t, same picture, every reload.
      </p>
      <Strip points={points} state="thinking" times={assemble} note="sphere → mark → back" tint={tint} />
      <Strip
        points={points}
        state="thinking"
        times={holds}
        note="HOLD, four cycles apart — must be identical"
        tint={tint}
      />
      <Strip
        points={points}
        state="thinking"
        times={rise}
        note="THE MORPH — no growth beat, straight in and out"
        tint={tint}
      />
      <Strip points={points} state="solving" times={solve} note="logo → cube → solve → logo, no spin" tint={tint} />
      <Strip points={points} state="listening" times={meter} note="logo → a floating body that bounces → logo" tint={tint} />
      <Strip
        points={points}
        state="listening"
        times={rise}
        note="THE MORPH — the reference to match"
        tint={tint}
      />
      <Strip points={points} state="searching" times={globe} note="logo → an even sphere, swept → logo" tint={tint} />
      <Strip
        points={points}
        state="searching"
        times={sweep}
        note="THE SWEEP — the band must never leave the near side"
        tint={tint}
      />
      <Strip points={cube} state="solving" times={solve} note="GitHub — the busy-mark hard case" />
      <Strip points={points} state="orbiting" times={globe} note="logo → a ringed planet → logo" tint={tint} />
      <Strip points={points} state="breathing" times={globe} note="logo → a bellows of stacked rings → logo" tint={tint} />
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
