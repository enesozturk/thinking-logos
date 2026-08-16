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
function inkOf(o: Record<string, number | undefined>, zx: number, edge: number): number {
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
const CHURN = 2.1;
const RISE = 1.15;
const HOLD = 2.3;
const FALL = 0.95;
const CYCLE = CHURN + RISE + HOLD + FALL;

/** Assembly amount in [0, 1] at a point in the cycle: 0 sphere, 1 logo. */
function assembly(local: number): number {
  if (local < CHURN) return 0;
  if (local < CHURN + RISE) return smoothE((local - CHURN) / RISE);
  if (local < CHURN + RISE + HOLD) return 1;
  return 1 - smoothE((local - CHURN - RISE - HOLD) / FALL);
}

/**
 * Accumulated spin angle at a point in the cycle.
 *
 * The sphere spins freely and the assembled logo must come to rest facing
 * the viewer, so angular velocity is `spin · (1 − assembly)`. Integrating
 * that numerically would need state the engine is not allowed to keep, so
 * it is integrated in closed form instead: ∫₀ᵘ (1 − smoothstep) = u − u³ +
 * u⁴/2. The result is a rotation that eases to a genuine stop and then
 * accelerates back out, with no seam at the cycle boundary.
 */
function spinAngle(local: number, cycles: number, spin: number): number {
  const perCycle = spin * (CHURN + 0.5 * RISE + 0.5 * FALL);
  let a = cycles * perCycle;
  if (local < CHURN) return a + spin * local;
  a += spin * CHURN;
  if (local < CHURN + RISE) {
    const u = (local - CHURN) / RISE;
    return a + spin * RISE * (u - u * u * u + (u * u * u * u) / 2);
  }
  a += spin * RISE * 0.5;
  if (local < CHURN + RISE + HOLD) return a;
  const u = (local - CHURN - RISE - HOLD) / FALL;
  return a + spin * FALL * (u * u * u - (u * u * u * u) / 2);
}

export const frameLogoAssemble: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const cycles = Math.floor(t / CYCLE);
  const local = t - cycles * CYCLE;
  const m = assembly(local);
  const yaw = spinAngle(local, cycles, o.spin ?? 0.85);
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
    // Per-dot delay, hashed rather than indexed: an index-ordered stagger
    // would sweep the assembly across the mark like a wipe, which reads as
    // a progress bar. Hashed, the mark condenses out of the cloud at once.
    const delay = hashD(i, 3.1) * stagger;
    const mi = smoothE(clamp01(m * (1 + stagger) - delay));

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

// --- Orbit: the mark, circled by particles — a compound state ----------

export const frameLogoOrbit: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const base = frameLogoSpin(size, t, o, logo);
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const pt = makeProj(t * (o.orbitSpin ?? 0.9), o.orbitTilt ?? 0.38, cx, cx, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const orbitN = o.orbitN ?? 3;
  const perOrbit = o.perOrbit ?? 2;
  const ro = o.orbitR ?? 1.02;

  const dots = base.dots;
  for (let orb = 0; orb < orbitN; orb++) {
    const h = hashD(orb, 4.4);
    const inc = 0.3 + 1.1 * h;
    const ci = Math.cos(inc);
    const si = Math.sin(inc);
    for (let k = 0; k < perOrbit; k++) {
      const a = t * (0.8 + 0.5 * h) + (k / perOrbit) * 2 * Math.PI + orb * 2.1;
      const ox = Math.cos(a) * ro;
      const oy = Math.sin(a) * ro * ci;
      const oz = Math.sin(a) * ro * si;
      const [px, py, z] = pt(ox, oy, oz);
      const zx = clamp01((z + 1) / 2);
      dots.push({
        x: px,
        y: py,
        z,
        r: ((o.partR ?? 0.9) + (o.partRDepth ?? 1.2) * zx) * rs,
        white: 0.3 - 0.22 * zx
      });
    }
  }
  // Re-finalise: the particles were appended after the base frame was
  // already sorted, and drawing an unsorted frame breaks the occlusion that
  // makes a particle read as passing behind the mark.
  return finalizeFrame(dots, base.lines, o.rMin);
};
