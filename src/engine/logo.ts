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
import { angleDelta, fibDir, finalizeFrame, hashD, makeProj, radiusScale, vnoise } from './core';

const TURN = Math.PI * 2;

function smoothE(x: number): number {
  return x * x * (3 - 2 * x);
}

/**
 * Smootherstep — zero first AND second derivative at both ends.
 *
 * Smoothstep stops with zero velocity but a sudden change in acceleration,
 * which the eye reads as a small jolt at the end of a long move. Over a
 * two-second morph that jolt is what makes the assembly feel like it halts
 * rather than arrives.
 */
export function smootherE(x: number): number {
  return x * x * x * (x * (x * 6 - 15) + 10);
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
 * Lay the mark's dots out as a wireframe globe — meridians and parallels.
 *
 * Deliberately a different solid from the one `thinking` uses. That state's
 * orb is a Fibonacci lattice: an even scatter with no structure, which is
 * right for a mark dissolving into raw material. Search is not raw material
 * — it is a place being looked at — and the visual shorthand for that,
 * everywhere on the web, is a globe with lines of longitude and latitude.
 * Putting the dots ON those lines rather than over the whole surface is
 * what makes the difference read at a glance.
 *
 * Dots are allocated to each curve in proportion to its arc length, so the
 * spacing along a short polar parallel matches the spacing along the
 * equator instead of bunching at the poles.
 */
export function buildGlobe(points: LogoPointSet, meridians: number, parallels: number): Float32Array {
  const n = points.n;
  const M = Math.max(2, meridians);
  const P = Math.max(1, parallels);

  const lens: number[] = [];
  for (let m = 0; m < M; m++) lens.push(2 * Math.PI);
  const lats: number[] = [];
  for (let q = 0; q < P; q++) {
    const lat = -Math.PI / 2 + ((q + 1) * Math.PI) / (P + 1);
    lats.push(lat);
    lens.push(2 * Math.PI * Math.cos(lat));
  }
  const total = lens.reduce((a, b) => a + b, 0);

  const counts = lens.map((l) => Math.max(3, Math.round((n * l) / total)));
  // Rounding never lands on exactly n; push the slack onto the longest
  // curve, where a dot more or less is invisible.
  let sum = counts.reduce((a, b) => a + b, 0);
  let biggest = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[biggest]) biggest = i;
  counts[biggest] += n - sum;
  if (counts[biggest] < 3) counts[biggest] = 3;

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (let m = 0; m < M; m++) {
    // A great circle through both poles — a full meridian ring.
    const lon = (m * Math.PI) / M;
    const cl = Math.cos(lon);
    const sl = Math.sin(lon);
    for (let k = 0; k < counts[m]; k++) {
      const a = (k / counts[m]) * 2 * Math.PI;
      xs.push(Math.cos(a) * cl);
      ys.push(Math.sin(a));
      zs.push(Math.cos(a) * sl);
    }
  }
  for (let q = 0; q < P; q++) {
    const lat = lats[q];
    const cl = Math.cos(lat);
    const sy = Math.sin(lat);
    for (let k = 0; k < counts[M + q]; k++) {
      const a = (k / counts[M + q]) * 2 * Math.PI;
      xs.push(cl * Math.cos(a));
      ys.push(sy);
      zs.push(cl * Math.sin(a));
    }
  }

  // Pair by angle about the centre, the same way `seatMap` does, so dots
  // travel roughly radially and the mark folds into the globe rather than
  // scattering into it.
  const count = Math.min(n, xs.length);
  const byLogo = new Uint32Array(n);
  const bySeat = new Uint32Array(xs.length);
  const logoAng = new Float32Array(n);
  const seatAng = new Float32Array(xs.length);
  for (let i = 0; i < n; i++) {
    byLogo[i] = i;
    logoAng[i] = Math.atan2(points.p[i * 3 + 1], points.p[i * 3]);
  }
  for (let i = 0; i < xs.length; i++) {
    bySeat[i] = i;
    seatAng[i] = Math.atan2(ys[i], xs[i]);
  }
  byLogo.sort((a, b) => logoAng[a] - logoAng[b]);
  bySeat.sort((a, b) => seatAng[a] - seatAng[b]);

  const out = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const src = bySeat[k % count];
    const dst = byLogo[k];
    out[dst * 3] = xs[src];
    out[dst * 3 + 1] = ys[src];
    out[dst * 3 + 2] = zs[src];
  }
  return out;
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

// --- Scan: a wireframe globe, scanned, interrupted by the mark ---------

/**
 * The mark becomes a globe, a meridian sweeps it, and the mark returns.
 *
 * Before this, `searching` swept a highlight across the stationary logo —
 * which next to the other states reads as nothing more than a shimmer
 * applied to a mark, with no idea of *searching* anywhere in it. A state
 * earns its name by becoming something, and what search should become is
 * obvious once said out loud: a globe with a scan running round it.
 *
 * The globe is built from meridians and parallels rather than an even
 * scatter, precisely so it does NOT look like the orb in `thinking`. Two
 * states that both dissolve into the same ball are one state with two
 * labels.
 */
export const frameLogoScan: ModeFrame = (size, t, o, logo) => {
  if (!logo || !logo.globe) return empty();
  const { p, e, n } = logo.points;
  const g3 = logo.globe;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const b = beatAt(
    t,
    o.dwell ?? 4,
    o.morph ?? 0.62,
    o.breathDur ?? 0.5,
    o.turns ?? 1,
    o.settle ?? 0.45
  );
  const m = b.m;
  const g = 1 - m;

  const pt = makeProj(TURN * b.turns, (o.tiltAmp ?? 0.34) * g, cx, cx, R);

  const sphereR = o.sphereR ?? 0.94;
  const width = o.scanWidth ?? 0.5;
  // The scan runs in the globe's own longitude, so it stays a meridian
  // however far the globe has turned — a sweep fixed to the screen would
  // slide off the surface as soon as the camera moved.
  const scan = t * (o.scanRate ?? 2.1);
  const dimBase = o.dimBase ?? 0.55;
  const puff = 1 + (o.breathe ?? 0.07) * b.breath;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const gx = g3[i * 3] * sphereR;
    const gy = g3[i * 3 + 1] * sphereR;
    const gz = g3[i * 3 + 2] * sphereR;

    const x = p[i * 3] * puff + (gx - p[i * 3] * puff) * g;
    const y = p[i * 3 + 1] * puff + (gy - p[i * 3 + 1] * puff) * g;
    const z3 = p[i * 3 + 2] * puff + (gz - p[i * 3 + 2] * puff) * g;

    const d = angleDelta(Math.atan2(gz, gx), scan);
    const boost = Math.exp(-(d * d) / width) * g;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r:
        ((o.rBase ?? 0.5) +
          (o.rDepth ?? 1.4) * zx +
          (o.rBoost ?? 1) * boost +
          (o.breatheR ?? 0.22) * b.breath) *
        rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) - (o.breatheInk ?? 0.14) * b.breath,
      // Un-scanned dots dim only once the globe has formed, so the mark
      // itself is never shown at partial opacity.
      a: 1 - (1 - dimBase) * g * (1 - Math.min(1, boost))
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

/** One full cycle, in engine seconds before the preset's speed multiplier. */
export const CYCLE = 7.6;

/**
 * easeInOutExpo — near-still at both ends, very fast through the middle.
 *
 * The CSS equivalent of `cubic-bezier(0.87, 0, 0.13, 1)`. Smoothstep and
 * smootherstep spread their motion evenly enough that a morph reads as a
 * slow continuous drift; an exponential ease holds, snaps, and settles,
 * which is what makes a transformation feel deliberate rather than gradual.
 */
export function expoInOut(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2;
}

/**
 * Rotation that cruises: eased at both ends, constant in between.
 *
 * A plain smootherstep across a long span puts all the speed in the middle,
 * so the orb visibly surges and slows for no reason. What is wanted is a
 * turn that starts, holds a steady rate, and stops — the ramps are shaped,
 * the middle is linear, and the whole thing integrates to exactly 1.
 */
function cruise(x: number, edge: number): number {
  const a = Math.min(0.49, Math.max(0.001, edge));
  const v = 1 / (1 - a);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x < a) {
    const u = x / a;
    return v * a * (u * u * u - (u * u * u * u) / 2);
  }
  if (x > 1 - a) {
    const u = (1 - x) / a;
    return 1 - v * a * (u * u * u - (u * u * u * u) / 2);
  }
  return v * (a * 0.5 + (x - a));
}

/** Where the cycle is, and what everything downstream reads off it. */
export interface Beat {
  /** 0 = working form, 1 = the mark. */
  m: number;
  /** One smooth 0 → 1 → 0 pulse while the mark is showing. */
  breath: number;
  /** Whole turns completed; lands on an integer before the mark appears. */
  turns: number;
  /** Seconds into the working-form dwell — what `solve` and `scan` run on. */
  workT: number;
  local: number;
  cycle: number;
}

/**
 * The cycle: dwell in the working form, morph to the mark, one breath,
 * morph back.
 *
 * Four explicit phases rather than a derived envelope, because every one of
 * them turned out to need its own duration, and deriving them from a single
 * bell meant tuning one by distorting the others. Nothing here is flat
 * except the dwell, which is the one pause that is actually wanted — the
 * mark never simply sits, it arrives, breathes once, and leaves.
 *
 * Rotation belongs to the working form. It runs across the dwell and eases
 * out partway through the morph in, so the orb is still turning as it
 * begins to become the mark, then settles. On the way back there is none at
 * all: a whole turn crammed into a half-second exit is the spin that reads
 * as frantic, and it buys nothing — the form is dissolving anyway.
 *
 * Because the count of turns is a whole number, the mark is always shown at
 * a whole revolution — dead face-on, every cycle — and the cycle closes
 * seamlessly with no accumulator and no state.
 */
export function beatAt(
  t: number,
  dwell: number,
  morph: number,
  breathDur: number,
  turns: number,
  settle: number
): Beat {
  const cycle = dwell + morph * 2 + breathDur;
  const local = t % cycle;

  // Rotation spans the dwell plus the first part of the morph in.
  const spinSpan = dwell + morph * settle;
  const spun = turns * cruise(Math.min(1, local / spinSpan), 0.22);

  if (local < dwell) {
    return { m: 0, breath: 0, turns: spun, workT: local, local, cycle };
  }
  const intoMorph = local - dwell;
  if (intoMorph < morph) {
    return { m: expoInOut(intoMorph / morph), breath: 0, turns: spun, workT: -1, local, cycle };
  }
  const intoBreath = intoMorph - morph;
  if (intoBreath < breathDur) {
    return {
      m: 1,
      breath: Math.sin(Math.PI * (intoBreath / breathDur)),
      turns: spun,
      workT: -1,
      local,
      cycle
    };
  }
  const out = (intoBreath - breathDur) / morph;
  return { m: expoInOut(1 - out), breath: 0, turns: spun, workT: -1, local, cycle };
}

/**
 * Per-dot assembly, hashed rather than indexed.
 *
 * An index-ordered stagger sweeps the assembly across the mark like a wipe,
 * which reads as a progress bar. Hashed, the mark condenses out of the
 * cloud all at once.
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

  const b = beatAt(
    t,
    o.dwell ?? 4,
    o.morph ?? 0.62,
    o.breathDur ?? 0.5,
    o.turns ?? 1,
    o.settle ?? 0.45
  );
  const m = b.m;

  const pt = makeProj(TURN * b.turns, (o.tiltAmp ?? 0.34) * (1 - m), cx, cx, R);

  const stagger = o.stagger ?? 0.55;
  const arc = o.arc ?? 0.2;
  const churn = o.churn ?? 0.09;
  const sphereR = o.sphereR ?? 0.92;
  const share = o.haloShare ?? 0.12;
  // The mark's whole moment on screen: one quick swell instead of sitting
  // still. Half a second, and then it is already leaving.
  const puff = 1 + (o.breathe ?? 0.07) * b.breath;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const mi = dotAssembly(i, m, stagger);

    const seat = seats[i];
    const [fx, fy, fz] = fibDir(seat, n);
    // Sphere seats breathe on their own so the dispersed state is alive
    // rather than a frozen ball waiting for its cue — which matters far
    // more now that the orb is where most of the cycle is spent.
    const wob = sphereR * (1 + churn * (vnoise(fx * 2 + t * 0.7, fz * 2) - 0.5) * 2);

    let lx = p[i * 3] * puff;
    let ly = p[i * 3 + 1] * puff;
    let lz = p[i * 3 + 2] * puff;

    let halo = 0;
    if (hashD(i, 6.7) < share) {
      halo = m;
      const osc = Math.sin(t * (o.haloRate ?? 0.9) + hashD(i, 8.3) * TURN);
      const out = 1 + (o.haloOut ?? 0.18) * (0.5 + 0.5 * osc) * halo;
      lx *= out;
      ly *= out;
      lz += (o.haloZ ?? 0.8) * osc * halo;
    }

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
    const travel = Math.sin(Math.PI * mi);
    dots.push({
      x: px,
      y: py,
      z,
      r:
        ((o.rBase ?? 0.55) +
          (o.rDepth ?? 1.5) * zx +
          (o.haloR ?? 0.22) * halo +
          (o.breatheR ?? 0.22) * b.breath) *
        rs,
      white: inkOf(o, zx, e[i] * mi + (1 - mi)) - (o.breatheInk ?? 0.14) * b.breath,
      a: 1 - (o.flightFade ?? 0.25) * travel
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Orbit: a third of the mark wanders its own edges -----------------

/**
 * Particles that are the logo's own dots, not extras added on top.
 *
 * Two things make this read the way it should, and the first version had
 * neither. A meaningful FRACTION has to be away at once — a handful of
 * travellers around an otherwise intact mark reads as decoration, and the
 * mark never visibly gives anything up. And they must not share a path: a
 * common orbit radius draws a ring, and a ring is a separate object
 * orbiting the logo rather than the logo coming apart.
 *
 * So a third of the dots travel, each one drifting around the region of the
 * silhouette it came from, at its own radius, on its own noise. The gaps
 * they leave are spread across the whole mark instead of hollowing out one
 * side, and every traveller returns to the exact seat it left.
 */
export const frameLogoOrbit: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj(
    (o.yawAmp ?? 0.2) * Math.sin(t * (o.yawRate ?? 0.5)),
    (o.tiltAmp ?? 0.1) * Math.sin(t * 0.38),
    cx,
    cx,
    R
  );

  // The share that is allowed to be away. A third is about the ceiling: the
  // silhouette survives losing a scattered third of its dots, and stops
  // being recognisable somewhere past a half.
  const share = o.travelShare ?? 0.3;
  const rate = o.travelRate ?? 0.22;
  const swing = o.travelSwing ?? 1.5;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];

    if (hashD(i, 6.7) >= share) {
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

    // Continuous excursion rather than a discrete trip: `away` is never
    // parked at zero for long, so the set is always in motion and the
    // hashed phases keep every traveller at a different point in its own
    // journey. The exponent below one biases toward being out.
    const phase = (t * rate * (0.65 + hashD(i, 1.9) * 0.7) + hashD(i, 8.3)) % 1;
    const away = Math.sin(Math.PI * phase) ** 0.9;

    // Drift is relative to where the dot already is, not toward a shared
    // orbit. Sending a third of the mark out to a common radius empties the
    // logo into a cloud — tried it, and the S was gone. Pushing each dot a
    // short way past its OWN position instead means an interior dot barely
    // leaves and an edge dot steps just outside the silhouette, so what the
    // viewer sees is the mark with a live fringe rather than a swarm.
    const homeR = Math.hypot(lx, ly);
    // The angular drift OSCILLATES within a bounded arc rather than
    // accumulating with time. An unbounded sweep — even a slow one — carries
    // a dot all the way round the mark, so a dot that left the top of the S
    // comes back down at the bottom and the silhouette dissolves into a
    // uniform cloud. Bounded, each traveller only ever patrols its own
    // stretch of the outline, and the shape reads through the whole cycle.
    const wander = Math.sin(t * (0.5 + hashD(i, 5.5) * 0.7) + hashD(i, 7.1) * 6.28);
    const ang = Math.atan2(ly, lx) + swing * away * wander;
    const reach = (o.reach ?? 0.12) + (o.reachVary ?? 0.16) * hashD(i, 4.1);
    const rad = homeR + reach * away + 0.04 * (vnoise(lx * 3 + t * 0.5, ly * 3) - 0.5);
    const ox = Math.cos(ang) * rad;
    const oy = Math.sin(ang) * rad;
    const oz = lz + (vnoise(lx * 2 + t * 0.4, ly * 2 + 9.1) - 0.5) * (o.orbitZ ?? 0.35);

    const [px, py, z] = pt(
      lx + (ox - lx) * away,
      ly + (oy - ly) * away,
      lz + (oz - lz) * away
    );
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      // Travellers read brighter and larger — they are the ones doing the
      // work — and fade back as they re-seat.
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.partBoost ?? 0.45) * away) * rs,
      white: inkOf(o, zx, e[i]) - (o.partInk ?? 0.2) * away
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
