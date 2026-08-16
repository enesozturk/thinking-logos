// Step 2a: alpha mask → ordered outline loops, via marching squares.
//
// Why not trace the original SVG path with `getPointAtLength`? Because the
// path and the silhouette are different shapes. A logo whose mark is built
// from a thick stroke, or from two overlapping shapes, has a path that runs
// through the middle of the ink rather than around it — sampling it puts
// dots inside the letterform instead of on its edge. Marching squares
// traces what the eye actually sees: the boundary of the rendered coverage,
// holes and all, no matter how the artwork was constructed.
//
// The threshold crossing is interpolated per edge, so the loops are
// sub-pixel accurate. Snapping to the raster grid instead would quantise
// the outline into visible stair-steps once dots sit a few pixels apart.

import type { AlphaMask } from './mask';
import { maskAt } from './mask';

export type Pt = [number, number];

/** Directed edge crossings per marching-squares case, inside kept to one side. */
type Edge = 'T' | 'R' | 'B' | 'L';
const CASES: Record<number, ReadonlyArray<readonly [Edge, Edge]>> = {
  1: [['T', 'L']],
  2: [['R', 'T']],
  3: [['R', 'L']],
  4: [['B', 'R']],
  5: [
    ['T', 'L'],
    ['B', 'R']
  ],
  6: [['B', 'T']],
  7: [['B', 'L']],
  8: [['L', 'B']],
  9: [['T', 'B']],
  10: [
    ['R', 'T'],
    ['L', 'B']
  ],
  11: [['R', 'B']],
  12: [['L', 'R']],
  13: [['T', 'R']],
  14: [['L', 'T']]
};

/** The saddle cases resolve the other way when the cell centre is inside. */
const CASES_ALT: Record<number, ReadonlyArray<readonly [Edge, Edge]>> = {
  5: [
    ['T', 'R'],
    ['B', 'L']
  ],
  10: [
    ['R', 'B'],
    ['L', 'T']
  ]
};

function lerpT(va: number, vb: number, thr: number): number {
  const d = vb - va;
  if (Math.abs(d) < 1e-9) return 0.5;
  return Math.min(1, Math.max(0, (thr - va) / d));
}

function crossing(edge: Edge, x: number, y: number, va: number, vb: number, vc: number, vd: number, thr: number): Pt {
  switch (edge) {
    case 'T':
      return [x + lerpT(va, vb, thr), y];
    case 'R':
      return [x + 1, y + lerpT(vb, vc, thr)];
    case 'B':
      return [x + lerpT(vd, vc, thr), y + 1];
    default:
      return [x, y + lerpT(va, vd, thr)];
  }
}

// Endpoints are matched by a quantised key. The grid is at most a few
// hundred cells wide and crossings are exact per shared edge, so 1e-3 is
// far below the gap between distinct crossings and far above float noise.
function key(p: Pt): string {
  return `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`;
}

/**
 * Trace every closed boundary in the mask at the given coverage threshold.
 *
 * Returns one loop per contour — the outer silhouette plus every hole,
 * which is what keeps the counter of an "a" or the gap in a ring visible
 * once the shape is rendered as dots.
 */
export function traceContours(m: AlphaMask, thr: number): Pt[][] {
  const segs: Array<[Pt, Pt]> = [];
  for (let y = 0; y < m.h - 1; y++) {
    for (let x = 0; x < m.w - 1; x++) {
      const va = maskAt(m, x, y);
      const vb = maskAt(m, x + 1, y);
      const vc = maskAt(m, x + 1, y + 1);
      const vd = maskAt(m, x, y + 1);
      let code = 0;
      if (va >= thr) code |= 1;
      if (vb >= thr) code |= 2;
      if (vc >= thr) code |= 4;
      if (vd >= thr) code |= 8;
      if (code === 0 || code === 15) continue;
      let table = CASES[code];
      if ((code === 5 || code === 10) && (va + vb + vc + vd) / 4 >= thr) table = CASES_ALT[code];
      for (const [from, to] of table) {
        segs.push([
          crossing(from, x, y, va, vb, vc, vd, thr),
          crossing(to, x, y, va, vb, vc, vd, thr)
        ]);
      }
    }
  }

  // Chain segments end-to-start into closed loops.
  const byStart = new Map<string, number[]>();
  segs.forEach(([s], i) => {
    const k = key(s);
    const list = byStart.get(k);
    if (list) list.push(i);
    else byStart.set(k, [i]);
  });

  const used = new Uint8Array(segs.length);
  const loops: Pt[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    const loop: Pt[] = [segs[i][0]];
    let cur = i;
    used[cur] = 1;
    // Bounded by the segment count: a loop can never revisit a segment.
    for (let guard = 0; guard < segs.length; guard++) {
      const end = segs[cur][1];
      loop.push(end);
      const next = (byStart.get(key(end)) || []).find((j) => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      cur = next;
    }
    // Two-segment stubs are raster noise from an isolated antialiased pixel.
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

/** Total length of a polyline treated as a closed loop. */
export function loopLength(loop: Pt[]): number {
  let total = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

/**
 * Lay `n` points evenly along a loop by arc length.
 *
 * Even spacing is the whole point: stepping by vertex index instead would
 * crowd dots wherever the contour tracer emitted short segments (every
 * curve) and starve the straight runs, which reads as a rendering bug
 * rather than a style.
 */
export function resampleLoop(loop: Pt[], n: number): Pt[] {
  const total = loopLength(loop);
  if (total <= 0 || n <= 0) return [];
  const out: Pt[] = [];
  let seg = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (seg < loop.length - 1) {
      const a = loop[seg];
      const b = loop[(seg + 1) % loop.length];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= target) break;
      acc += l;
      seg++;
    }
    const a = loop[seg];
    const b = loop[(seg + 1) % loop.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const f = l > 0 ? Math.min(1, (target - acc) / l) : 0;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/**
 * Sample every contour, splitting a fixed dot budget between them by
 * perimeter so that dot SPACING is uniform across the whole mark — a small
 * hole gets few dots, the outer silhouette gets many, and neither looks
 * denser than the other.
 *
 * Loops shorter than `minLen` are dropped: below roughly a dot's own
 * spacing a contour cannot read as a shape, it only adds a smudge.
 */
export function sampleOutline(m: AlphaMask, thr: number, budget: number, minLen: number): Pt[] {
  const loops = traceContours(m, thr).filter((l) => loopLength(l) >= minLen);
  if (!loops.length) return [];
  const lens = loops.map(loopLength);
  const total = lens.reduce((s, l) => s + l, 0);
  const out: Pt[] = [];
  for (let i = 0; i < loops.length; i++) {
    const n = Math.max(3, Math.round((lens[i] / total) * budget));
    out.push(...resampleLoop(loops[i], n));
  }
  return out;
}
