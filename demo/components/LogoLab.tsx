import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ThinkingLogo } from '../../src/ThinkingLogo';
import { serializeLogo } from '../../src/bake/bake';
import type { LogoPointSet, LogoStyle, ShellMode } from '../../src/engine/cloud';
import type { LogoState } from '../../src/logoPresets';
import type { LogoSource } from '../../src/bake/bake';
import { BRANDS } from '../brands';
import { CopyButton } from './CopyButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Label className="w-16 shrink-0 text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * A single-select toggle group.
 *
 * Base UI's group is already single-select, but it still reports an array.
 * Wrapping it once keeps that shape out of the four places this is used,
 * and ignoring the empty array means clicking the active option cannot
 * leave the control with nothing selected.
 */
function Picker<T extends string>({
  value,
  onChange,
  options
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => {
        if (v.length) onChange(v[v.length - 1] as T);
      }}
      size="sm"
      spacing={1}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o} value={o} className="px-3">
          {o}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function LogoLab() {
  const [custom, setCustom] = useState<{ name: string; svg: string } | null>(null);
  const [brandKey, setBrandKey] = useState('x');
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
  const source: LogoSource = custom
    ? { svg: custom.svg }
    : brand.svg
      ? { svg: brand.svg }
      : { path: brand.path };
  const tint = tinted && !custom ? `#${brand.hex}` : undefined;
  const label = custom ? custom.name : brand.title;

  // Identity matters: `useBakedLogo` re-bakes when the option VALUES change,
  // and a fresh object here every render would be harmless but noisy.
  const bakeOpts = useMemo(() => ({ style, shell, count }), [style, shell, count]);
  // `dwell` is how long the working form — orb, cube, sphere, body — gets
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
    <section className="mb-10 w-full" aria-label="Playground">
      <h2 className="mb-3 text-base leading-[34px]">Playground</h2>

      <Card
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
        className={`p-6 transition-shadow ${dragging ? 'ring-2 ring-ring' : ''}`}
      >
        <div className="flex items-start gap-8 max-md:flex-col">
          {/* preview */}
          <div className="flex shrink-0 flex-col items-center gap-5">
            <div className="flex size-[180px] items-center justify-center rounded-xl bg-muted">
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
                  <span className="text-[11px] text-muted-foreground">{s}px</span>
                </div>
              ))}
            </div>
          </div>

          {/* controls */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Row label="Mark">
              {custom ? (
                <>
                  <span className="text-[13px]">{custom.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setCustom(null)}>
                    clear
                  </Button>
                </>
              ) : (
                <Select value={brandKey} onValueChange={(v) => setBrandKey(v as string)}>
                  <SelectTrigger size="sm" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b.key} value={b.key}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                drop or pick an SVG…
              </Button>
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
              <Picker value={state} onChange={setState} options={STATES} />
            </Row>

            <Row label="Style">
              <Picker value={style} onChange={setStyle} options={STYLES} />
            </Row>

            <Row label="Shell">
              <Picker value={shell} onChange={setShell} options={SHELLS} />
            </Row>

            <Row label="Dots">
              <Slider
                className="w-48"
                min={40}
                max={900}
                step={10}
                value={count}
                onValueChange={(v) => setCount(Array.isArray(v) ? v[0] : v)}
              />
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {count} asked · {baked ? baked.n : '—'} placed
              </span>
            </Row>

            <Row label="Dwell">
              <Slider
                className="w-48"
                min={1}
                max={10}
                step={0.5}
                value={dwell ?? dwells}
                onValueChange={(v) => setDwell(Array.isArray(v) ? v[0] : v)}
              />
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {(dwell ?? dwells).toFixed(1)}s in the working form
              </span>
              {dwell !== null && (
                <Button variant="ghost" size="sm" onClick={() => setDwell(null)}>
                  reset
                </Button>
              )}
            </Row>

            <Row label="Morph">
              <Slider
                className="w-48"
                min={0.4}
                max={4}
                step={0.1}
                value={morph ?? 1.9}
                onValueChange={(v) => setMorph(Array.isArray(v) ? v[0] : v)}
              />
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {(morph ?? 1.9).toFixed(1)}s each way, into and out of the mark
              </span>
              {morph !== null && (
                <Button variant="ghost" size="sm" onClick={() => setMorph(null)}>
                  reset
                </Button>
              )}
            </Row>

            <Row label="Colour">
              <Button
                variant={tinted ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setTinted((v) => !v)}
                disabled={!!custom}
              >
                {custom ? 'monochrome (drop has no brand colour)' : tinted ? 'brand' : 'monochrome'}
              </Button>
            </Row>

            {error && (
              <p className="text-[13px] leading-5 text-destructive" role="alert">
                {error.message}
              </p>
            )}
            {/* The gap between asked and placed is the shape talking back:
                a thin mark simply has nowhere to put more dots. */}
            {baked && baked.n < count * 0.75 && (
              <p className="text-[13px] leading-5 text-muted-foreground">
                {label} only had room for {baked.n} dots at this spacing — the mark is thinner than the
                count assumes. That is a property of the artwork, not a failed bake.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="relative mt-3 flex items-start overflow-hidden rounded-lg bg-muted py-1.5 pr-12 pl-3">
        <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm leading-[22px] whitespace-pre">
          {snippet}
        </code>
        <CopyButton className="absolute top-1 right-1" getText={() => snippet} />
      </div>

      {baked && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">
            Baked: {baked.n} points · {(serializeLogo(baked).length / 1024).toFixed(1)} KB of JSON
          </span>
          {/* Copying the point set is the whole production story in one
              button: bake once here, commit the JSON, and the app never
              ships a rasteriser. */}
          <CopyButton getText={() => serializeLogo(baked)} />
        </div>
      )}
    </section>
  );
}
