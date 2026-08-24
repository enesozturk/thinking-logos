// Assemble a self-contained component from the library's own source.
//
// The point of the playground is that someone can configure a mark and
// leave with working code, and the code they leave with should not need
// this package installed. The bake is the only part that needs a DOM and
// the playground has already done it, so a copied file carries the finished
// point set and never touches a rasteriser: no async, no `<img>` decode, no
// work on the user's first paint.
//
// Everything here is read from `src/` at build time with `?raw` and spliced
// verbatim. Hand-writing a second copy of the engine to paste from would
// have been far easier and would have started drifting the first time a
// mode was tuned — which, over the life of this file, has been most days.

import coreSrc from '../../src/engine/core.ts?raw';
import latticeSrc from '../../src/engine/lattice.ts?raw';
import logoSrc from '../../src/engine/logo.ts?raw';
import deformSrc from '../../src/engine/logoDeform.ts?raw';
import tintSrc from '../../src/engine/tint.ts?raw';
import type { LogoPointSet } from '../../src/engine/cloud';
import type { LogoMode, LogoState } from '../../src/logoPresets';
import { LOGO_PRESETS, LOGO_STATE_TO_MODE } from '../../src/logoPresets';
import type { ModeOpts } from '../../src/engine/profiles';

/** Which file each mode's frame function lives in, and what else it needs. */
const MODE_SOURCE: Record<LogoMode, { fn: string; from: 'logo' | 'deform'; extras?: string[] }> = {
  assemble: { fn: 'frameLogoAssemble', from: 'logo' },
  scan: { fn: 'frameLogoScan', from: 'logo' },
  work: { fn: 'frameLogoWork', from: 'logo' },
  wave: { fn: 'frameLogoWave', from: 'deform' },
  wait: { fn: 'frameLogoWait', from: 'deform' },
  crystal: { fn: 'frameLogoCrystal', from: 'deform' },
  solve: { fn: 'frameLogoSolve', from: 'deform', extras: ['cubeSeat', 'makeCubeMoves'] }
};

const LOGO_FRAMES = ['frameLogoAssemble', 'frameLogoScan', 'frameLogoWork'];

/**
 * Take a top-level declaration and its body by matching braces.
 *
 * Crude by design. These are the library's own files, formatted by one
 * tool, and a real parser would be a dependency and a week of work to
 * protect against a failure mode that shows up instantly in the preview.
 */
function takeBlock(src: string, name: string): string {
  const re = new RegExp(`^(?:export )?(?:const|function) ${name}\\b`, 'm');
  const start = src.search(re);
  if (start < 0) return '';
  // Walk back over the doc comment so the copied code keeps its reasoning.
  let head = start;
  const before = src.slice(0, start);
  const doc = before.lastIndexOf('/**');
  if (doc >= 0 && before.slice(doc).trim().endsWith('*/')) head = doc;

  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const end = src.indexOf('\n', i);
  return src.slice(head, end < 0 ? src.length : end).replace(/^export /gm, '');
}

/** Drop a declaration and its body, leaving everything around it. */
function dropBlock(src: string, name: string): string {
  const block = takeBlock(src, name);
  return block ? src.replace(block, '').replace(/\n{3,}/g, '\n\n') : src;
}

function stripHeader(src: string): string {
  return src
    .replace(/^import[\s\S]*?from '[^']+';\n/gm, '')
    .replace(/^export /gm, '')
    .replace(/^\/\/[^\n]*\n(?:\/\/[^\n]*\n)*\n/, '')
    .trim();
}

const TYPES = `/** Minimal local types — the copied file depends on nothing. */
interface ModeOpts {
  [key: string]: number | undefined;
}
interface LogoPointSet {
  readonly n: number;
  readonly p: Float32Array;
  readonly e: Float32Array;
}
type SeatMap = Uint32Array;
interface LogoBinding {
  readonly points: LogoPointSet;
  readonly seats: SeatMap;
}
type ModeFrame = (size: number, t: number, opts: ModeOpts, logo?: LogoBinding) => OrbFrame;`;

function pointsLiteral(set: LogoPointSet): string {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  const p = Array.from(set.p, r).join(',');
  const e = Array.from(set.e, r).join(',');
  return `// ${set.n} dots, baked from your artwork. No rasteriser at runtime.
const POINTS: LogoPointSet = {
  n: ${set.n},
  p: Float32Array.from([${p}]),
  e: Float32Array.from([${e}])
};`;
}

function optsLiteral(opts: ModeOpts): string {
  const body = Object.entries(opts)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => `  ${k}: ${v}`)
    .join(',\n');
  return `const OPTS: ModeOpts = {\n${body}\n};`;
}

export interface StandaloneInput {
  name: string;
  state: LogoState;
  points: LogoPointSet;
  tint?: string;
  tune?: ModeOpts;
}

/** Build the whole file. */
export function buildStandalone({ name, state, points, tint, tune }: StandaloneInput): string {
  const mode = LOGO_STATE_TO_MODE[state];
  const spec = MODE_SOURCE[mode];
  const opts = { ...LOGO_PRESETS[mode].opts, ...tune };
  const component = name.replace(/[^A-Za-z0-9]/g, '') || 'ThinkingMark';

  let core = stripHeader(coreSrc);
  // `paint` and `paintLines` are the greyscale painter; `paintFrame` calls
  // them. Line modes are gone from the logo set, so the stroke pass never
  // runs — but it costs four lines and keeps `paintFrame` verbatim.
  core = dropBlock(core, 'radiusScale');

  let logo = stripHeader(logoSrc);
  for (const fn of LOGO_FRAMES) if (fn !== spec.fn) logo = dropBlock(logo, fn);
  if (spec.from === 'deform') for (const fn of LOGO_FRAMES) logo = dropBlock(logo, fn);
  logo = dropBlock(logo, 'seatMap');

  const parts = [
    `// ${component} — generated by the Thinking Logos playground.`,
    `// State: ${state}. Paste this file in and import it; it needs only React.`,
    ``,
    `import { useEffect, useRef, useState } from 'react';`,
    ``,
    TYPES,
    ``,
    core,
    ``,
    // radiusScale is used by every mode, so put it back in one known place.
    `/** Dot radii were tuned for a 300pt frame; sub-linear scaling keeps small
 * spinners legible. Lower pow = radii shrink less with size. */
function radiusScale(size: number, pow: number): number {
  return (size / 300) ** pow;
}`,
    ``,
    logo
  ];

  if (spec.from === 'deform') {
    const deform = stripHeader(deformSrc);
    if (spec.extras) for (const x of spec.extras) parts.push('', takeBlock(deform, x));
    parts.push('', takeBlock(deform, spec.fn));
  }

  if (mode === 'solve') {
    const lattice = stripHeader(latticeSrc);
    parts.push('', takeBlock(lattice, 'solveCycle'), '', takeBlock(lattice, 'applyMoves'));
    parts.push('', `interface Move { axis: 0 | 1 | 2; lo: number; hi: number; ang: number; }`);
  }

  if (tint) parts.push('', stripHeader(tintSrc));

  parts.push(
    '',
    pointsLiteral(points),
    '',
    optsLiteral(opts),
    '',
    seatMapSource(),
    '',
    componentSource(component, spec.fn, tint)
  );

  return parts.filter((p) => p !== undefined).join('\n');
}

function seatMapSource(): string {
  return `/**
 * Which sphere seat each dot flies home from. Two sorts, so it runs once.
 *
 * Pairing by index looks like static — the dots cross in a uniform scramble
 * and the assembly reads as noise resolving. Pairing by angle means each
 * dot travels roughly radially and the silhouette is legible early.
 */
function seatMap(points: LogoPointSet): SeatMap {
  const n = points.n;
  const byLogo = new Uint32Array(n);
  const bySeat = new Uint32Array(n);
  const logoAng = new Float32Array(n);
  const seatAng = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    byLogo[i] = i;
    bySeat[i] = i;
    logoAng[i] = Math.atan2(points.p[i * 3 + 1], points.p[i * 3]);
    const [sx, sy] = fibDir(i, n);
    seatAng[i] = Math.atan2(sy, sx);
  }
  byLogo.sort((a, b) => logoAng[a] - logoAng[b]);
  bySeat.sort((a, b) => seatAng[a] - seatAng[b]);
  const seats = new Uint32Array(n);
  for (let k = 0; k < n; k++) seats[byLogo[k]] = bySeat[k];
  return seats;
}

const BINDING: LogoBinding = { points: POINTS, seats: seatMap(POINTS) };`;
}

function componentSource(name: string, fn: string, tint?: string): string {
  const paint = tint
    ? `      const rgb = adaptTint(parseTint('${tint}')!, dark);
      paintFrameTinted(ctx, frame, dark, rgb);`
    : `      paintFrame(ctx, frame, dark);`;

  return `/** Resolve the substrate from a \`.dark\`/\`data-theme\` ancestor, else the OS. */
function useDark(host: React.RefObject<Element | null>): boolean {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const resolve = () => {
      let node: Element | null = host.current;
      while (node) {
        const attr = node.getAttribute('data-theme');
        if (attr === 'dark') return setDark(true);
        if (attr === 'light') return setDark(false);
        if (node.classList.contains('dark')) return setDark(true);
        if (node.classList.contains('light')) return setDark(false);
        node = node.parentElement;
      }
      setDark(matchMedia('(prefers-color-scheme: dark)').matches);
    };
    resolve();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', resolve);
    const mo = new MutationObserver(resolve);
    mo.observe(document.documentElement, { attributes: true, subtree: true });
    return () => {
      mq.removeEventListener('change', resolve);
      mo.disconnect();
    };
  }, [host]);
  return dark;
}

export function ${name}({ size = 64 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dark = useDark(ref);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const frame = ${fn}(size, t, OPTS, BINDING);
${paint}
    };

    // Reduced motion gets one static frame, taken from inside the hold.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(4.2);
      return;
    }

    let raf = 0;
    let running = false;
    const loop = () => {
      render(performance.now() / 1000);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    render(performance.now() / 1000);

    // Free while offscreen or on a hidden tab.
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && document.visibilityState !== 'hidden') start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
      else if (visible) start();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [size, dark]);

  return <canvas ref={ref} role="img" style={{ width: size, height: size, display: 'block' }} />;
}`;
}
