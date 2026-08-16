// Step 3: give the flat sample a third dimension.
//
// This is the step that makes a logo behave like the orbs instead of like a
// sticker. The engine carries depth purely through dot radius and ink
// weight, so a point cloud with a real z distribution picks up that whole
// visual language for free — near dots grow and brighten, far dots recede,
// z-sorting does the occlusion. A z of zero everywhere renders as a flat
// card that vanishes edge-on when it rotates.

import type { ShellMode } from '../engine/cloud';
import type { AlphaMask } from './mask';
import type { Pt } from './contour';

/**
 * Chamfer distance transform: for every pixel, the approximate distance to
 * the nearest non-ink pixel.
 *
 * Exact Euclidean would cost more and buy nothing here — the result only
 * drives a smooth height ramp, where a few percent of anisotropy is
 * invisible. The (3, 4) weights are the standard integer approximation;
 * dividing by 3 converts back to pixel units.
 */
export function edgeDistance(m: AlphaMask, thr: number): Float32Array {
  const { w, h } = m;
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = m.a[i] >= thr ? INF : 0;

  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

function sampleDist(d: Float32Array, w: number, h: number, x: number, y: number): number {
  const xi = Math.min(w - 1, Math.max(0, Math.round(x)));
  const yi = Math.min(h - 1, Math.max(0, Math.round(y)));
  return d[yi * w + xi];
}

export interface ShellPoint {
  x: number;
  y: number;
  z: number;
  /** Normalised distance from the silhouette edge, 0 at the edge, 1 deepest. */
  e: number;
}

/**
 * Lift 2D mask-space points into the engine's unit-sphere coordinate space.
 *
 * Output is centred on the origin with y pointing UP, matching `makeProj`
 * in the engine — mask space is y-down, and flipping here rather than in the
 * renderer keeps every downstream consumer (canvas, Skia, SwiftUI) working
 * from one convention.
 *
 * - `flat` — z = 0. Cheapest, and correct when the mark should read as a
 *   graphic rather than an object.
 * - `dome` — inflate: height rises with distance from the edge, so the
 *   silhouette stays pinned to the plane while the body bulges toward the
 *   viewer. `sqrt` rather than a linear ramp, because a linear one gives a
 *   cone-shaped profile with a visible crease along the medial axis.
 * - `slab` — extrude to a front and a back face joined by a wall of outline
 *   dots, so the mark has thickness and reads as a solid turning in space.
 */
export function buildShell(
  pts2: Pt[],
  outline: Pt[],
  m: AlphaMask,
  thr: number,
  mode: ShellMode,
  depth: number
): ShellPoint[] {
  const dist = edgeDistance(m, thr);
  let maxD = 1e-6;
  for (let i = 0; i < dist.length; i++) if (dist[i] > maxD) maxD = dist[i];

  const half = m.w / 2;
  const toX = (px: number) => (px - half) / half;
  const toY = (py: number) => -(py - m.h / 2) / (m.h / 2);
  const edgeOf = (p: Pt) => Math.min(1, sampleDist(dist, m.w, m.h, p[0], p[1]) / maxD);

  const out: ShellPoint[] = [];

  if (mode === 'flat') {
    for (const p of pts2) out.push({ x: toX(p[0]), y: toY(p[1]), z: 0, e: edgeOf(p) });
    return out;
  }

  if (mode === 'dome') {
    for (const p of pts2) {
      const e = edgeOf(p);
      out.push({ x: toX(p[0]), y: toY(p[1]), z: depth * Math.sqrt(e), e });
    }
    return out;
  }

  // slab: two faces plus a side wall
  const hz = depth / 2;
  for (const p of pts2) {
    const e = edgeOf(p);
    out.push({ x: toX(p[0]), y: toY(p[1]), z: hz, e });
    out.push({ x: toX(p[0]), y: toY(p[1]), z: -hz, e });
  }
  // The wall needs enough rings that it reads as a surface rather than as
  // two stacked outlines; one ring per dot-spacing of depth is the floor.
  const rings = Math.max(1, Math.round(depth * 6));
  for (let r = 1; r <= rings; r++) {
    const z = hz - (r / (rings + 1)) * depth;
    for (const p of outline) out.push({ x: toX(p[0]), y: toY(p[1]), z, e: 0 });
  }
  return out;
}
