import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import { serializeLogo } from '../../src/bake/bake';
import type { LogoPointSet, LogoStyle, ShellMode } from '../../src/engine/cloud';
import type { LogoState } from '../../src/logoPresets';
import type { LogoSource } from '../../src/bake/bake';
import { BRANDS } from '../brands';
import { CopyButton } from './CopyButton';

const STATES: LogoState[] = [
  'thinking',
  'solving',
  'listening',
  'searching',
  'working',
  'orbiting',
  'breathing'
];
const STYLES: LogoStyle[] = ['fill', 'outline', 'both'];
const SHELLS: ShellMode[] = ['dome', 'flat', 'slab'];

// The sizes a loading indicator actually ships at: chat avatar, inline
// button, and inline text. Showing all three at once is the only reliable
// way to catch a bake that only works when it is big.
const SHIP_SIZES = [64, 44, 20];

const tabBase =
  'h-8 px-3 rounded-full text-[13px] leading-none transition-colors cursor-pointer bg-(--tab-bg) text-(--tab-color) hover:bg-(--tab-hover-bg) hover:text-(--tab-hover-color)';
const tabOn = 'bg-(--tab-active-bg) text-(--tab-active-color) shadow-(--tab-active-shadow)';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="w-16 shrink-0 text-[13px] text-(--footer-muted)">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

export function LogoLab() {
  const [custom, setCustom] = useState<{ name: string; svg: string } | null>(null);
  const [brandKey, setBrandKey] = useState('stripe');
  const [state, setState] = useState<LogoState>('thinking');
  const [style, setStyle] = useState<LogoStyle>('fill');
  const [shell, setShell] = useState<ShellMode>('dome');
  const [tinted, setTinted] = useState(true);
  const [count, setCount] = useState(300);
  // Per-state default, since the solve needs more room than a plain dwell.
  const [dwell, setDwell] = useState<number | null>(null);
  const [morph, setMorph] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [baked, setBaked] = useState<LogoPointSet | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const brand = BRANDS.find((b) => b.key === brandKey) ?? BRANDS[0];
  // A dropped SVG wins over the brand picker until it is cleared, so the
  // control that was touched last is the one that is obviously in effect.
  const source: LogoSource = custom ? { svg: custom.svg } : { path: brand.path };
  const tint = tinted && !custom ? `#${brand.hex}` : undefined;
  const label = custom ? custom.name : brand.title;

  // Identity matters: `useBakedLogo` re-bakes when the option VALUES change,
  // and a fresh object here every render would be harmless but noisy.
  const bakeOpts = useMemo(() => ({ style, shell, count }), [style, shell, count]);
  // `dwell` is how long the working form — orb, cube, globe, body — gets
  // before the mark interrupts it. Null means "leave the state's default".
  const tune = useMemo(() => {
    if (dwell === null && morph === null) return undefined;
    const t: { dwell?: number; morph?: number } = {};
    if (dwell !== null) t.dwell = dwell;
    if (morph !== null) t.morph = morph;
    return t;
  }, [dwell, morph]);
  const dwells = state === 'solving' ? 5.5 : 4;

  const accept = useCallback(async (file: File) => {
    setError(null);
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      setError(new Error('Drop an .svg file — bitmaps have no silhouette to trace cleanly.'));
      return;
    }
    setCustom({ name: file.name.replace(/\.svg$/i, ''), svg: await file.text() });
  }, []);

  const snippet = [
    `import { ThinkingLogo } from 'thinking-logo';`,
    ``,
    `<ThinkingLogo`,
    `  logo={{ svg: mySvg }}`,
    `  state="${state}"`,
    `  size={64}`,
    tint ? `  tint="${tint}"` : null,
    `  bake={{ style: '${style}', shell: '${shell}', count: ${count} }}`,
    dwell === null && morph === null
      ? null
      : `  tune={{ ${[dwell === null ? null : `dwell: ${dwell}`, morph === null ? null : `morph: ${morph}`]
          .filter(Boolean)
          .join(', ')} }}`,
    `/>`
  ]
    .filter((l) => l !== null)
    .join('\n');

  return (
    <section className="w-full mb-10" aria-label="Logo playground">
      <h2 className="text-base font-normal leading-[34px] text-(--section-title-color) mb-3">
        Bake your own
      </h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void accept(file);
        }}
        className={`rounded-2xl bg-(--panel-bg) p-6 transition-shadow ${
          dragging ? 'shadow-[inset_0_0_0_2px_var(--tab-active-color)]' : ''
        }`}
      >
        <div className="flex items-start gap-8 max-md:flex-col">
          {/* preview */}
          <div className="flex flex-col items-center gap-5 shrink-0">
            <div className="flex items-center justify-center size-[180px] rounded-2xl bg-(--surface)">
              <ThinkingLogo
                logo={source}
                state={state}
                size={140}
                tint={tint}
                bake={bakeOpts}
                tune={tune}
                onBake={(p, e) => {
                  setBaked(p);
                  setError(e);
                }}
              />
            </div>
            <div className="flex items-end gap-5">
              {SHIP_SIZES.map((s) => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <ThinkingLogo logo={source} state={state} size={s} tint={tint} bake={bakeOpts} tune={tune} />
                  <span className="text-[11px] text-(--footer-muted)">{s}px</span>
                </div>
              ))}
            </div>
          </div>

          {/* controls */}
          <div className="flex-1 min-w-0 flex flex-col gap-3.5">
            <Row label="Mark">
              {custom ? (
                <>
                  <span className="h-8 px-3 rounded-full text-[13px] leading-8 bg-(--tab-active-bg) text-(--tab-active-color)">
                    {custom.name}
                  </span>
                  <button type="button" className={tabBase} onClick={() => setCustom(null)}>
                    clear
                  </button>
                </>
              ) : (
                <select
                  value={brandKey}
                  onChange={(e) => setBrandKey(e.target.value)}
                  className="h-8 px-3 rounded-full text-[13px] bg-(--tab-bg) text-(--tab-active-color) cursor-pointer"
                >
                  {BRANDS.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.title}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className={tabBase} onClick={() => fileRef.current?.click()}>
                drop or pick an SVG…
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void accept(f);
                }}
              />
            </Row>

            <Row label="State">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${tabBase} ${state === s ? tabOn : ''}`}
                  onClick={() => setState(s)}
                >
                  {s}
                </button>
              ))}
            </Row>

            <Row label="Style">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${tabBase} ${style === s ? tabOn : ''}`}
                  onClick={() => setStyle(s)}
                >
                  {s}
                </button>
              ))}
            </Row>

            <Row label="Shell">
              {SHELLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${tabBase} ${shell === s ? tabOn : ''}`}
                  onClick={() => setShell(s)}
                >
                  {s}
                </button>
              ))}
            </Row>

            <Row label="Dots">
              <input
                type="range"
                min={40}
                max={900}
                step={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-48 accent-(--tab-active-color)"
              />
              <span className="text-[13px] text-(--footer-muted) tabular-nums">
                {count} asked · {baked ? baked.n : '—'} placed
              </span>
            </Row>

            <Row label="Dwell">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={dwell ?? dwells}
                onChange={(e) => setDwell(Number(e.target.value))}
                className="w-48 accent-(--tab-active-color)"
              />
              <span className="text-[13px] text-(--footer-muted) tabular-nums">
                {(dwell ?? dwells).toFixed(1)}s in the working form
              </span>
              {dwell !== null && (
                <button type="button" className={tabBase} onClick={() => setDwell(null)}>
                  reset
                </button>
              )}
            </Row>

            <Row label="Morph">
              <input
                type="range"
                min={0.4}
                max={4}
                step={0.1}
                value={morph ?? 1.9}
                onChange={(e) => setMorph(Number(e.target.value))}
                className="w-48 accent-(--tab-active-color)"
              />
              <span className="text-[13px] text-(--footer-muted) tabular-nums">
                {(morph ?? 1.9).toFixed(1)}s each way, into and out of the mark
              </span>
              {morph !== null && (
                <button type="button" className={tabBase} onClick={() => setMorph(null)}>
                  reset
                </button>
              )}
            </Row>

            <Row label="Colour">
              <button
                type="button"
                className={`${tabBase} ${tinted ? tabOn : ''}`}
                onClick={() => setTinted((v) => !v)}
                disabled={!!custom}
              >
                {custom ? 'monochrome (drop has no brand colour)' : tinted ? 'brand' : 'monochrome'}
              </button>
            </Row>

            {error && (
              <p className="text-[13px] leading-5 text-[#ff6b6b]" role="alert">
                {error.message}
              </p>
            )}
            {/* The gap between asked and placed is the shape talking back:
                a thin mark simply has nowhere to put more dots. */}
            {baked && baked.n < count * 0.75 && (
              <p className="text-[13px] leading-5 text-(--footer-muted)">
                {label} only had room for {baked.n} dots at this spacing — the mark is thinner than the
                count assumes. That is a property of the artwork, not a failed bake.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start bg-(--code-bg) rounded-[10px] mt-3 py-1.5 pr-10 pl-3 overflow-hidden relative">
        <code className="font-[Roboto_Mono,monospace] text-sm leading-[22px] text-(--code-text) whitespace-pre overflow-x-auto min-w-0 flex-1">
          {snippet}
        </code>
        <CopyButton getText={() => snippet} />
      </div>

      {baked && (
        <div className="flex items-center gap-3 mt-3">
          <span className="text-[13px] text-(--footer-muted)">
            Baked: {baked.n} points · {(serializeLogo(baked).length / 1024).toFixed(1)} KB of JSON
          </span>
          {/* Copying the point set is the whole production story in one
              button: bake once here, commit the JSON, and the app never
              ships a rasteriser. The wrapper is sized because CopyButton is
              absolutely positioned for its usual home in a code block. */}
          <div className="relative size-9 shrink-0">
            <CopyButton getText={() => serializeLogo(baked)} />
          </div>
        </div>
      )}
    </section>
  );
}
