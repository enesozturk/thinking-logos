// The bake: artwork in, portable point set out.
//
// This is the boundary the whole design hangs on. Everything in here may
// touch the DOM, allocate, take milliseconds and think in pixels. Nothing
// downstream may do any of those things — the engine's frame functions are
// closure-free, allocation-light and `Math`-only so they can run inside a
// Reanimated worklet on a native UI thread and be diffed numerically
// against the SwiftUI port.
//
// So: bake once (build step, or once per mount, memoised), then hand the
// result to the engine as inert data. A `LogoPointSet` is JSON — commit it,
// diff it, ship it to a platform that has no SVG renderer at all.

import type { LogoPointSet, LogoStyle, ShellMode } from '../engine/cloud';
import type { AlphaMask } from './mask';
import { rasterizeImage, rasterizePath, rasterizeSvg, trimAndCenter } from './mask';
import type { Pt } from './contour';
import { sampleOutline } from './contour';
import { fillToCount } from './fill';
import { buildShell } from './shell';

/** Artwork, in whichever form the caller happens to have it. */
export type LogoSource =
  | { svg: string }
  | { path: string; viewBox?: number }
  | { image: CanvasImageSource }
  | { mask: AlphaMask };

export interface BakeOptions {
  /** Dots to aim for. The single legibility knob — see `recommendedCount`. */
  count?: number;
  /** Outline traces the silhouette; fill covers it; both does each. @default 'fill' */
  style?: LogoStyle;
  /** How the flat sample is lifted into 3D. @default 'dome' */
  shell?: ShellMode;
  /** Shell height/thickness, in the engine's unit-sphere units. @default 0.34 */
  depth?: number;
  /** Raster resolution for the bake. Higher = finer edges, slower. @default 256 */
  resolution?: number;
  /** Coverage at which a pixel counts as ink. @default 0.5 */
  threshold?: number;
  /** Fraction of the frame left empty around the mark. @default 0.06 */
  margin?: number;
  /** Seed for the blue-noise sampler; same seed ⇒ same bytes. @default 1 */
  seed?: number;
}

const DEFAULTS = {
  count: 260,
  style: 'fill' as LogoStyle,
  shell: 'dome' as ShellMode,
  depth: 0.34,
  resolution: 256,
  threshold: 0.5,
  margin: 0.06,
  seed: 1
};

/**
 * Dot count that stays legible at a given rendered size.
 *
 * There is no clever answer here, only a hard constraint: dots need roughly
 * 2px of pitch to resolve as separate marks, so a 20px orb has room for a
 * couple of hundred at most and every extra dot past that turns the logo
 * into a blob. Callers who override `count` should preview at the smallest
 * size they actually ship.
 */
export function recommendedCount(size: number, style: LogoStyle): number {
  const area = Math.round((size * size) / 5.5);
  const n = style === 'outline' ? Math.round(size * 2.6) : area;
  return Math.max(24, Math.min(900, n));
}

async function toMask(source: LogoSource, res: number): Promise<AlphaMask> {
  if ('mask' in source) return source.mask;
  if ('svg' in source) return rasterizeSvg(source.svg, res);
  if ('path' in source) return rasterizePath(source.path, source.viewBox ?? 24, res);
  return rasterizeImage(source.image, res);
}

/**
 * Bake artwork into a point set.
 *
 * Async only because SVG markup has to round-trip through an image decode;
 * a `path` or `mask` source resolves without ever yielding.
 */
export async function bakeLogo(source: LogoSource, options: BakeOptions = {}): Promise<LogoPointSet> {
  const o = { ...DEFAULTS, ...options };
  const raw = await toMask(source, o.resolution);
  const m = trimAndCenter(raw, o.resolution, o.margin, o.threshold);

  // Contours are needed for the outline styles and, independently, for the
  // slab shell's side wall — so trace them whenever either asks.
  const needOutline = o.style !== 'fill' || o.shell === 'slab';
  const outlineBudget = o.style === 'both' ? Math.round(o.count * 0.42) : o.count;
  // A contour shorter than ~3 dot-pitches cannot read as a shape; below
  // that it is either raster noise or a detail this size cannot hold.
  const minLen = Math.max(6, (o.resolution / Math.sqrt(o.count)) * 3);
  const outline: Pt[] = needOutline ? sampleOutline(m, o.threshold, outlineBudget, minLen) : [];

  let pts: Pt[];
  if (o.style === 'outline') {
    pts = outline;
  } else if (o.style === 'fill') {
    pts = fillToCount(m, o.threshold, o.count, o.seed);
  } else {
    pts = [...outline, ...fillToCount(m, o.threshold, o.count - outline.length, o.seed)];
  }

  const shell = buildShell(pts, outline, m, o.threshold, o.shell, o.depth);

  const n = shell.length;
  const p = new Float32Array(n * 3);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    p[i * 3] = shell[i].x;
    p[i * 3 + 1] = shell[i].y;
    p[i * 3 + 2] = shell[i].z;
    e[i] = shell[i].e;
  }
  return { version: 1, n, p, e, style: o.style, shell: o.shell };
}

/** Serialise to compact JSON. Three decimals is well under one raster pixel. */
export function serializeLogo(set: LogoPointSet): string {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return JSON.stringify({
    version: set.version,
    n: set.n,
    style: set.style,
    shell: set.shell,
    p: Array.from(set.p, r),
    e: Array.from(set.e, r)
  });
}

/** Inverse of `serializeLogo` — the runtime-side half of a build-time bake. */
export function deserializeLogo(json: string | Record<string, unknown>): LogoPointSet {
  const raw = (typeof json === 'string' ? JSON.parse(json) : json) as {
    version: number;
    n: number;
    style: LogoStyle;
    shell: ShellMode;
    p: number[];
    e: number[];
  };
  if (raw.version !== 1) throw new Error(`thinking-logos: unsupported point-set version ${raw.version}`);
  return {
    version: 1,
    n: raw.n,
    p: Float32Array.from(raw.p),
    e: Float32Array.from(raw.e),
    style: raw.style,
    shell: raw.shell
  };
}
