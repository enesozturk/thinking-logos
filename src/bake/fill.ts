// Step 2b: alpha mask → an evenly spread point cloud covering the ink.
//
// Poisson-disk (Bridson) rather than a jittered grid. A grid keeps its rows
// no matter how much jitter you add — at logo scale the eye locks onto the
// lattice and reads a screen-door texture instead of a shape. Blue noise
// has no such structure, so the dots read as a material and the silhouette
// stays the only thing with an edge.
//
// Deterministic by construction: the PRNG is seeded and never touches
// Math.random, so the same SVG bakes to byte-identical points on every
// machine. That is what lets a baked point set be committed, diffed, and
// compared against the native ports' output.

import type { AlphaMask } from './mask';
import { maskAtF } from './mask';
import type { Pt } from './contour';

/** mulberry32 — small, fast, well-distributed, and reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Blue-noise fill of every region where coverage clears `thr`.
 *
 * `spacing` is the minimum distance between dots in mask pixels. Bridson
 * from a single seed only reaches one connected component, so once the
 * frontier is exhausted we re-seed from any still-uncovered ink pixel —
 * without that, a mark made of separate pieces (a dotted "i", a two-part
 * monogram) would bake with everything but the first piece missing.
 */
export function samplePoisson(m: AlphaMask, thr: number, spacing: number, seed: number): Pt[] {
  const rand = rng(seed);
  const cell = spacing / Math.SQRT2;
  const gw = Math.ceil(m.w / cell);
  const gh = Math.ceil(m.h / cell);
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts: Pt[] = [];
  const active: number[] = [];

  const gridIdx = (p: Pt) => Math.floor(p[1] / cell) * gw + Math.floor(p[0] / cell);

  const fits = (p: Pt): boolean => {
    if (p[0] < 0 || p[1] < 0 || p[0] >= m.w || p[1] >= m.h) return false;
    if (maskAtF(m, p[0], p[1]) < thr) return false;
    const cx = Math.floor(p[0] / cell);
    const cy = Math.floor(p[1] / cell);
    for (let y = Math.max(0, cy - 2); y <= Math.min(gh - 1, cy + 2); y++) {
      for (let x = Math.max(0, cx - 2); x <= Math.min(gw - 1, cx + 2); x++) {
        const i = grid[y * gw + x];
        if (i < 0) continue;
        const q = pts[i];
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) < spacing) return false;
      }
    }
    return true;
  };

  const push = (p: Pt) => {
    grid[gridIdx(p)] = pts.length;
    active.push(pts.length);
    pts.push(p);
  };

  // Scan order for re-seeding; stepping by half a spacing is enough to
  // notice any component big enough to hold a dot.
  const step = Math.max(1, Math.floor(spacing / 2));
  let scanX = 0;
  let scanY = 0;
  const nextSeed = (): Pt | null => {
    for (; scanY < m.h; scanY += step, scanX = 0) {
      for (; scanX < m.w; scanX += step) {
        const p: Pt = [scanX + 0.5, scanY + 0.5];
        if (fits(p)) return p;
      }
    }
    return null;
  };

  for (;;) {
    const seedPt = nextSeed();
    if (!seedPt) break;
    push(seedPt);
    while (active.length) {
      const ai = Math.floor(rand() * active.length);
      const p = pts[active[ai]];
      let placed = false;
      for (let k = 0; k < 24; k++) {
        const ang = rand() * Math.PI * 2;
        const rad = spacing * (1 + rand());
        const cand: Pt = [p[0] + Math.cos(ang) * rad, p[1] + Math.sin(ang) * rad];
        if (!fits(cand)) continue;
        push(cand);
        placed = true;
        break;
      }
      if (!placed) active.splice(ai, 1);
    }
  }
  return pts;
}

/**
 * Choose the spacing that lands closest to a target dot count.
 *
 * Callers think in dots ("give me 220 dots"), because that is what governs
 * legibility at a given pixel size, but the sampler is parameterised by
 * distance. Area ÷ count gives a good first guess; a few bisection rounds
 * absorb the fact that packing efficiency depends on the shape's thinness.
 */
export function fillToCount(m: AlphaMask, thr: number, target: number, seed: number): Pt[] {
  let ink = 0;
  for (let i = 0; i < m.a.length; i++) if (m.a[i] >= thr) ink++;
  if (!ink) return [];

  // Packing a region of `ink` pixels with `target` blue-noise dots puts them
  // roughly √(ink/target) apart; the constant is the measured Poisson-disk
  // packing efficiency. Bracketing around that guess rather than around the
  // whole plausible range is what keeps this to a handful of sampler runs.
  const guess = Math.max(0.5, Math.sqrt(ink / target) * 1.07);
  let lo = guess / 2;
  let hi = guess * 2;
  let best = samplePoisson(m, thr, guess, seed);
  for (let iter = 0; iter < 7; iter++) {
    if (Math.abs(best.length - target) <= Math.max(2, target * 0.04)) break;
    const mid = (lo + hi) / 2;
    const trial = samplePoisson(m, thr, mid, seed);
    // More dots than asked → the spacing is too tight → search coarser.
    if (trial.length > target) lo = mid;
    else hi = mid;
    if (Math.abs(trial.length - target) < Math.abs(best.length - target)) best = trial;
  }
  return best;
}
