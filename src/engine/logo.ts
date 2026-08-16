// The logo modes: a baked mark, animated with the orbs' visual language.
//
// Every mode here obeys the same contract as the nine orb modes — pure
// arithmetic over (size, t, opts), producing a finished, z-sorted frame.
// The only difference is where the geometry comes from: procedurally
// generated for an orb, baked from artwork for a logo. Depth is still
// carried by dot radius and ink weight alone, so a logo and an orb sitting
// next to each other read as the same material.

import type { Dot, LogoBinding, ModeFrame, OrbFrame } from './types';
import type { LogoPointSet, SeatMap } from './cloud';
import { fibDir, finalizeFrame, hashD, makeProj, radiusScale, vnoise } from './core';

function smoothE(x: number): number {
  return x * x * (3 - 2 * x);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Pair every logo dot with the sphere seat it flies home from.
 *
 * Pairing by index would work, and looks like static — the dots cross each
 * other in a uniform scramble and the assembly reads as noise resolving,
 * not as a mark forming. Pairing by angle about the centre means each dot
 * travels roughly radially, the cloud folds inward like a closing aperture,
 * and the silhouette is legible a good third of the way through the move.
 *
 * Two sorts, so this runs at resolve time and never per frame.
 */
export function seatMap(points: LogoPointSet): SeatMap {
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

/**
 * Pick well-spread nodes and wire the near ones together.
 *
 * Nodes come from farthest-point sampling rather than every k-th index: a
 * strided pick inherits whatever order the Poisson sampler happened to
 * place dots in, which clumps. Farthest-point spreads them over the mark's
 * actual extent, so the constellation covers the whole silhouette instead
 * of crowding wherever the fill started.
 *
 * The edge threshold is derived from the marks's own nearest-neighbour
 * spacing, not fixed, because a wide logo and a thin one have completely
 * different scales — a constant would over-connect one into a solid mesh
 * and leave the other as unconnected dust.
 *
 * Quadratic in the node count (a few dozen), so this is resolve-time work.
 */
export function buildGraph(
  points: LogoPointSet,
  nodeCount: number,
  reach: number
): { nodes: Uint32Array; edges: Uint32Array } {
  const { p, n } = points;
  const k = Math.max(2, Math.min(nodeCount, n));
  const nodes = new Uint32Array(k);
  const best = new Float64Array(n).fill(Number.POSITIVE_INFINITY);

  let current = 0;
  nodes[0] = current;
  for (let c = 1; c < k; c++) {
    let far = -1;
    let farD = -1;
    const cx = p[current * 3];
    const cy = p[current * 3 + 1];
    const cz = p[current * 3 + 2];
    for (let i = 0; i < n; i++) {
      const dx = p[i * 3] - cx;
      const dy = p[i * 3 + 1] - cy;
      const dz = p[i * 3 + 2] - cz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < best[i]) best[i] = d;
      if (best[i] > farD) {
        farD = best[i];
        far = i;
      }
    }
    current = far;
    nodes[c] = current;
  }

  // Mean nearest-neighbour distance across the chosen nodes sets the scale.
  let sum = 0;
  for (let a = 0; a < k; a++) {
    let near = Number.POSITIVE_INFINITY;
    for (let b = 0; b < k; b++) {
      if (a === b) continue;
      const dx = p[nodes[a] * 3] - p[nodes[b] * 3];
      const dy = p[nodes[a] * 3 + 1] - p[nodes[b] * 3 + 1];
      const dz = p[nodes[a] * 3 + 2] - p[nodes[b] * 3 + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < near) near = d;
    }
    sum += Math.sqrt(near);
  }
  const thr = (sum / k) * reach;

  const edges: number[] = [];
  for (let a = 0; a < k; a++) {
    for (let b = a + 1; b < k; b++) {
      const dx = p[nodes[a] * 3] - p[nodes[b] * 3];
      const dy = p[nodes[a] * 3 + 1] - p[nodes[b] * 3 + 1];
      const dz = p[nodes[a] * 3 + 2] - p[nodes[b] * 3 + 2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= thr) edges.push(a, b);
    }
  }
  return { nodes, edges: Uint32Array.from(edges) };
}

/**
 * What a logo mode renders before its artwork is baked. A fresh object each
 * time: a shared one would be handed to a caller that is free to mutate it.
 */
function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

// --- shared painting ---------------------------------------------------

/**
 * Ink and radius for one projected logo dot.
 *
 * `zx` is the projected depth normalised to [0, 1] over the unit sphere,
 * exactly as the orb modes compute it, so the near/far falloff matches.
 * `edge` is the baked distance from the silhouette boundary: weighting ink
 * by it gives the mark internal structure that survives being viewed
 * face-on, where projected depth alone is nearly constant and the whole
 * thing would otherwise flatten to a single tone.
 */
export function inkOf(o: Record<string, number | undefined>, zx: number, edge: number): number {
  const far = o.inkFar ?? 0.6;
  const span = o.inkSpan ?? 0.5;
  const rim = o.inkRim ?? 0.16;
  return far - span * zx - rim * (1 - edge);
}

// --- Spin: the mark turning in space — a branded idle ------------------

export const frameLogoSpin: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const yawAmp = o.yawAmp ?? 0.55;
  // A full rotation would spend a third of every cycle showing the mark
  // edge-on or mirrored, which is exactly when a logo stops being a logo.
  // Oscillating instead keeps it readable at every instant.
  const yaw = yawAmp * Math.sin(t * (o.yawRate ?? 0.9));
  const tilt = (o.tiltAmp ?? 0.16) * Math.sin(t * (o.tiltRate ?? 0.63) + 1.1);
  const pt = makeProj(yaw, tilt, cx, cx, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const breathe = 1 + (o.breathe ?? 0.02) * Math.sin(t * (o.breatheRate ?? 1.4));

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [px, py, z] = pt(p[i * 3] * breathe, p[i * 3 + 1] * breathe, p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.5) * zx) * rs,
      white: inkOf(o, zx, e[i])
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Scan: a plane sweeps the mark — searching, in your brand ----------

export const frameLogoScan: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const yaw = (o.yawAmp ?? 0.34) * Math.sin(t * (o.yawRate ?? 0.7));
  const pt = makeProj(yaw, (o.tiltAmp ?? 0.1) * Math.sin(t * 0.5), cx, cx, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dimBase = o.dimBase ?? 0.45;
  // The sweep runs in the mark's own x, from left edge to right and back,
  // so it reads as a scanner crossing the artwork rather than as a
  // highlight orbiting a sphere the viewer cannot see.
  const scanX = Math.sin(t * (o.scanRate ?? 1.6));
  const width = o.scanWidth ?? 0.26;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const lx = p[i * 3];
    const d = (lx - scanX) / width;
    const boost = Math.exp(-d * d);
    const [px, py, z] = pt(lx, p[i * 3 + 1], p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.5) + (o.rDepth ?? 1.3) * zx + (o.rBoost ?? 1.1) * boost) * rs,
      white: inkOf(o, zx, e[i]),
      a: dimBase + (1 - dimBase) * Math.min(1, boost)
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Unrest: the mark simmering in place — working --------------------

export const frameLogoUnrest: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const pt = makeProj((o.yawAmp ?? 0.22) * Math.sin(t * 0.55), (o.tiltAmp ?? 0.09) * Math.sin(t * 0.4), cx, cx, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const amp = o.unrest ?? 0.045;
  const rate = o.unrestRate ?? 0.9;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = p[i * 3];
    const y0 = p[i * 3 + 1];
    // Value noise sampled on a per-dot lattice offset: neighbouring dots
    // drift together in soft eddies rather than each vibrating on its own,
    // which is the difference between a mark that is thinking and one that
    // looks like it has a rendering fault.
    const nx = vnoise(x0 * 3 + t * rate, y0 * 3) - 0.5;
    const ny = vnoise(x0 * 3 + 41.7, y0 * 3 + t * rate) - 0.5;
    const [px, py, z] = pt(x0 + nx * amp * 2, y0 + ny * amp * 2, p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx) * rs,
      white: inkOf(o, zx, e[i])
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Assemble: sphere ⇄ logo — the whole point of the library ----------

// One cycle, in engine seconds before the preset's speed multiplier.
export const CHURN = 2.1;
export const RISE = 1.15;
export const HOLD = 2.3;
export const FALL = 0.95;
export const CYCLE = CHURN + RISE + HOLD + FALL;

const TURN = Math.PI * 2;

/** Assembly amount in [0, 1] at a point in the cycle: 0 sphere, 1 logo. */
export function assembly(local: number): number {
  if (local < CHURN) return 0;
  if (local < CHURN + RISE) return smoothE((local - CHURN) / RISE);
  if (local < CHURN + RISE + HOLD) return 1;
  return 1 - smoothE((local - CHURN - RISE - HOLD) / FALL);
}

/**
 * Spin angle through the cycle, landing the mark exactly face-on.
 *
 * The obvious version — integrate `spin · (1 − assembly)` so the rotation
 * eases to a stop — stops at whatever angle it happened to reach, and that
 * angle advances every cycle. The logo then settles at a slightly
 * different three-quarter view each time it assembles, which is the one
 * thing a logo must never do: a mark viewed off-axis is a mark shown wrong.
 *
 * So the hold angle is pinned to a whole number of turns instead. Each
 * phase is a closed-form ease between known endpoints:
 *
 *   churn → spins freely from where the previous cycle's fall left off
 *   rise  → eases to TARGET, the whole turn nearest its natural landing
 *   hold  → TARGET, which is 0 mod 2π: dead face-on, every single cycle
 *   fall  → accelerates back out by exactly the offset the churn expects
 *
 * That last line is what keeps it seamless: the fall ends at TARGET +
 * spin·FALL/2, and since TARGET is a whole turn, that is congruent to the
 * churn's starting offset. Position is continuous across the boundary with
 * no accumulator and no state.
 */
export function assembleYaw(local: number, spin: number): number {
  // Where the previous cycle's fall handed off — also this cycle's start.
  const churnStart = spin * FALL * 0.5;
  if (local < CHURN) return churnStart + spin * local;

  const riseStart = churnStart + spin * CHURN;
  // Round the angle it WOULD have coasted to, so the deceleration reads as
  // natural rather than as a snap to the nearest landmark.
  const target = TURN * Math.round((riseStart + spin * RISE * 0.5) / TURN);
  if (local < CHURN + RISE) {
    return riseStart + (target - riseStart) * smoothE((local - CHURN) / RISE);
  }
  if (local < CHURN + RISE + HOLD) return target;

  const u = (local - CHURN - RISE - HOLD) / FALL;
  return target + spin * FALL * (u * u * u - (u * u * u * u) / 2);
}

/** Split absolute time into a cycle index, position within it, and assembly. */
export function cycleAt(t: number): { cycles: number; local: number; m: number } {
  const cycles = Math.floor(t / CYCLE);
  const local = t - cycles * CYCLE;
  return { cycles, local, m: assembly(local) };
}

/**
 * Per-dot assembly, hashed rather than indexed.
 *
 * An index-ordered stagger sweeps the assembly across the mark like a
 * wipe, which reads as a progress bar. Hashed, the mark condenses out of
 * the cloud all at once.
 */
export function dotAssembly(i: number, m: number, stagger: number): number {
  return smoothE(clamp01(m * (1 + stagger) - hashD(i, 3.1) * stagger));
}

export const frameLogoAssemble: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const { local, m } = cycleAt(t);
  const yaw = assembleYaw(local, o.spin ?? 2);
  // The camera tilt settles with the assembly for the same reason the spin
  // does: a mark read at an angle is a mark read wrong.
  const tilt = (o.tiltAmp ?? 0.34) * (1 - m);
  const pt = makeProj(yaw, tilt, cx, cx, R);

  const stagger = o.stagger ?? 0.75;
  const arc = o.arc ?? 0.22;
  const churn = o.churn ?? 0.09;
  const sphereR = o.sphereR ?? 0.92;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const mi = dotAssembly(i, m, stagger);

    const seat = seats[i];
    const [fx, fy, fz] = fibDir(seat, n);
    // Sphere seats breathe on their own so the dispersed state is alive
    // rather than a frozen ball waiting for its cue.
    const wob = sphereR * (1 + churn * (vnoise(fx * 2 + t * 0.7, fz * 2) - 0.5) * 2);

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];

    let x = fx * wob + (lx - fx * wob) * mi;
    let y = fy * wob + (ly - fy * wob) * mi;
    let z3 = fz * wob + (lz - fz * wob) * mi;
    // Bow the flight path outward at mid-travel. A straight lerp collapses
    // every dot toward the centre at the same instant, and the mark briefly
    // disappears into a dense knot before re-emerging.
    const bow = 1 + arc * Math.sin(Math.PI * mi);
    x *= bow;
    y *= bow;
    z3 *= bow;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    // In flight the dot is neither sphere nor mark; fading it slightly
    // keeps the two resolved states as the things the eye locks onto.
    const travel = Math.sin(Math.PI * mi);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.5) * zx) * rs,
      white: inkOf(o, zx, e[i] * mi + (1 - mi)),
      a: 1 - (o.flightFade ?? 0.25) * travel
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Orbit: dots leave the mark, circle it, and come back -------------

/**
 * Particles that are the logo's own dots, not extras added on top.
 *
 * Drawing separate particles around an intact mark is the easy version and
 * it reads as two unrelated things sharing a frame. Here a hashed subset of
 * the dots detaches, flies an inclined orbit, and returns to the exact seat
 * it left — so the mark visibly loses material while the work is happening
 * and is made whole again when it finishes. The gap is the point: it is
 * what makes the motion belong to the logo rather than decorate it.
 *
 * Each traveller keeps its own period and phase from its index hash, so
 * departures are staggered and the mark is never all there or all gone.
 */
export const frameLogoOrbit: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj(
    (o.yawAmp ?? 0.26) * Math.sin(t * (o.yawRate ?? 0.55)),
    (o.tiltAmp ?? 0.12) * Math.sin(t * 0.4),
    cx,
    cx,
    R
  );

  // Fraction of the mark that is allowed to be away at any one time. Past
  // roughly a fifth the silhouette starts to break up, and a logo with
  // holes in it stops being recognisable — which is the failure this whole
  // library exists to avoid.
  const share = o.travelShare ?? 0.16;
  const orbitR = o.orbitR ?? 1.06;
  const rate = o.travelRate ?? 0.34;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const pick = hashD(i, 6.7);
    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];

    if (pick >= share) {
      const [px, py, z] = pt(lx, ly, lz);
      const zx = clamp01((z + 1) / 2);
      dots.push({
        x: px,
        y: py,
        z,
        r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx) * rs,
        white: inkOf(o, zx, e[i])
      });
      continue;
    }

    // A traveller's cycle: leave, orbit, return, then rest at home for a
    // while. `away` is the eased in-flight amount; at 0 the dot sits in the
    // mark and is indistinguishable from a dot that never travels. The
    // per-dot rate jitter stops the whole set pulsing in lockstep.
    const phase = (t * rate * (0.7 + hashD(i, 1.9) * 0.6) + hashD(i, 8.3)) % 1;
    const flight = clamp01((phase - 0.08) / 0.62);
    const away = Math.sin(Math.PI * clamp01(flight)) ** 0.75;

    // Orbit plane from the dot's own hash, so travellers fan out over many
    // inclinations instead of sharing one visible ring.
    const inc = hashD(i, 4.1) * Math.PI;
    const spin = t * (0.7 + hashD(i, 5.5) * 0.7) * (hashD(i, 2.2) < 0.5 ? 1 : -1) + hashD(i, 7.1) * 6.28;
    const ox = Math.cos(spin) * orbitR;
    const oy = Math.sin(spin) * orbitR * Math.cos(inc);
    const oz = Math.sin(spin) * orbitR * Math.sin(inc);

    const x = lx + (ox - lx) * away;
    const y = ly + (oy - ly) * away;
    const z3 = lz + (oz - lz) * away;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      // A dot in flight is doing the work, so it reads brighter and larger
      // than the mark it came out of — and fades back as it re-seats.
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.partBoost ?? 0.5) * away) * rs,
      white: inkOf(o, zx, e[i]) - (o.partInk ?? 0.22) * away,
      a: 1 - 0.15 * away * (1 - away) * 4
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
