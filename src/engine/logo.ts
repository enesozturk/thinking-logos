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

// --- Scan: an evenly packed sphere, swept by a meridian ----------------

/**
 * The mark becomes a sphere with a bright meridian sweeping round it, and
 * the mark returns.
 *
 * Two wrong turns got here. First it was a highlight crossing the
 * stationary logo, which next to the other states read as a shimmer applied
 * to a mark, with no idea of *searching* anywhere in it. Then it was a
 * wireframe of meridians and parallels — which said globe, but said it the
 * way every stock icon says it, and packed the dots into lines that bunch
 * at the poles and thin at the equator.
 *
 * The dots are now spread by the Fibonacci lattice, which is the closest
 * thing there is to equal spacing on a sphere: no seams, no poles, no
 * clumping, and no borrowed iconography. What makes it read as searching is
 * not the construction but the SWEEP — a meridian of longitude travelling
 * round the surface with everything behind it held back. An even field lit
 * by a moving line reads as something being scanned; a drawn grid just
 * reads as a picture of a globe.
 *
 * It shares its lattice with `thinking`'s orb and stays completely distinct
 * from it, because the difference between those two states was never the
 * geometry — one is an inert ball dissolving, the other is a surface being
 * examined.
 */
export const frameLogoScan: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const b = beatAt(
    t,
    o.dwell ?? 5.5,
    o.morph ?? 1.9,
    o.turns ?? 1,
    o.settle ?? 0.1,
    o.expo ?? 0.3
  );
  const m = b.m;
  const g = 1 - m;

  const yaw = TURN * b.turns;
  const pt = makeProj(yaw, (o.tiltAmp ?? 0.34) * g, cx, cx, R);

  const sphereR = o.sphereR ?? 0.94;
  const width = o.scanWidth ?? 0.22;
  // A meridian in the sphere's own longitude, so the lit band runs pole to
  // pole and bows with the surface — that curved, oval band is the whole
  // look, and a band measured in screen space is a flat wipe that reads as
  // a shimmer laid over the object rather than as light on it.
  //
  // What it must not do is wander behind the sphere, which is what an
  // accumulating longitude does for half of every pass. So the sweep is
  // anchored to the CAMERA: `yaw + π/2` is whichever longitude currently
  // faces the viewer, and the band oscillates about that. Bounded below
  // π/2, it can never reach the silhouette, so it is always on the near
  // side however far the sphere has turned.
  const scan = yaw + Math.PI / 2 + (o.scanSwing ?? 1.05) * Math.sin(t * (o.scanRate ?? 0.85));
  const dimBase = o.dimBase ?? 0.4;

  // How much the lattice is biased toward the equator. Above 1 it thins
  // the caps; at 1 it is the plain equal-area Fibonacci sphere.
  const ease = o.poleEase ?? 1.4;

  // Draw out the lattice's own spirals.
  //
  // A Fibonacci sphere already contains them: points whose indices differ
  // by a Fibonacci number are neighbours along one arm, so `i mod 13`
  // labels which of thirteen spirals a dot belongs to. Left alone that
  // structure is invisible — every dot the same weight reads as an even
  // fog, which is what made this orb the plainest thing in the set.
  // Weighting the arms in a repeating cycle makes the spirals surface as
  // threads winding pole to pole. Nothing is moved; the geometry is the
  // same equal-area lattice, only differently inked.
  const arms = Math.max(3, Math.round(o.arms ?? 13));
  const armDepth = o.armDepth ?? 0.55;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [ax, ay, az] = fibDir(seats[i], n);

    // Loosen the poles.
    //
    // The lattice is equal-area, so the caps hold as many dots per square
    // unit as the equator does — but a sphere presents its caps almost
    // edge-on, and equal area over a foreshortened region reads as a
    // pile-up. Compressing latitude toward the equator by a fractional
    // power moves dots out of the caps and leaves them airier, and because
    // the ring radius is recomputed from the new latitude the silhouette is
    // untouched: this redistributes density without reshaping anything.
    const lat = (ay < 0 ? -1 : 1) * Math.abs(ay) ** ease;
    const ring0 = Math.sqrt(Math.max(1e-9, 1 - ay * ay));
    const ring = Math.sqrt(Math.max(0, 1 - lat * lat)) / ring0;
    const fx = ax * ring;
    const fy = lat;
    const fz = az * ring;

    // Three weights repeating across the arms: enough to read as a weave,
    // few enough that no arm disappears.
    const tier = (seats[i] % arms) % 3;
    const arm = 1 - armDepth * (tier === 0 ? 0 : tier === 1 ? 0.5 : 1);

    const gx = fx * sphereR;
    const gy = fy * sphereR;
    const gz = fz * sphereR;

    const x = p[i * 3] + (gx - p[i * 3]) * g;
    const y = p[i * 3 + 1] + (gy - p[i * 3 + 1]) * g;
    const z3 = p[i * 3 + 2] + (gz - p[i * 3 + 2]) * g;

    // A meridian, not a spot: distance is measured in longitude alone, so
    // the lit band runs pole to pole and the whole sphere is swept rather
    // than a patch of it.
    const d = angleDelta(Math.atan2(fz, fx), scan);
    const boost = Math.exp(-(d * d) / width) * g;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.5) + (o.rDepth ?? 1.4) * zx * arm + (o.rBoost ?? 1.3) * boost) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) + (o.armInk ?? 0.16) * (1 - arm) * g - (o.scanInk ?? 0.3) * boost,
      // Un-swept dots dim only once the sphere has formed, so the mark
      // itself is never shown at partial opacity.
      a: 1 - (1 - dimBase) * g * (1 - Math.min(1, boost))
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

/**
 * easeInOutExpo — the CSS `cubic-bezier(0.87, 0, 0.13, 1)` curve.
 *
 * Near-still at both ends, very fast through the middle.
 */
export function expoInOut(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2;
}

/**
 * The morph curve: smootherstep with a measured amount of expo mixed in.
 *
 * Pure expo was tried and works against what this transition needs. Its
 * flat tails mean the morph barely moves for the first and last third,
 * which reads as the mark pausing at each end — the exact pause being
 * designed out — while its violent middle covers most of the distance in a
 * few frames and reads as a snap. Slow AND stalled, which is the worst of
 * both.
 *
 * The blend keeps expo's character — a deliberate ease in, a confident
 * middle — without the dead zones. Duration does the rest: 300 dots
 * travelling across the frame need several times the 0.6s a CSS transform
 * on a single block would.
 */
function morphEase(x: number, expo: number): number {
  const smooth = x * x * x * (x * (x * 6 - 15) + 10);
  return smooth + (expoInOut(x) - smooth) * expo;
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
  /** Whole turns completed; lands on an integer before the mark appears. */
  turns: number;
  /** Seconds into the working-form dwell — what `solve` and `scan` run on. */
  workT: number;
  local: number;
  cycle: number;
}

/**
 * The cycle: dwell in the working form, morph to the mark, morph back.
 *
 * Explicit phases rather than a derived envelope, because each turned out
 * to need its own duration, and deriving them from a single bell meant
 * tuning one by distorting the others. Nothing here is flat except the
 * dwell, which is the one pause that is actually wanted: the mark is
 * reached and immediately left, so the morph out begins the instant the
 * morph in completes.
 *
 * Rotation belongs to the working form. It runs across the dwell and eases
 * out partway through the morph in, so the orb is still turning as it
 * begins to become the mark, then settles. On the way back there is none at
 * all: a whole turn crammed into a short exit is the spin that reads as
 * frantic, and it buys nothing — the form is dissolving anyway.
 *
 * Because the count of turns is a whole number, the mark is always shown at
 * a whole revolution — dead face-on, every cycle — and the cycle closes
 * seamlessly with no accumulator and no state.
 */
export function beatAt(
  t: number,
  dwell: number,
  morph: number,
  turns: number,
  settle: number,
  expo = 0.3
): Beat {
  const cycle = dwell + morph * 2;
  const local = t % cycle;

  // Rotation spans the dwell plus the first part of the morph in.
  const spinSpan = dwell + morph * settle;
  const spun = turns * cruise(Math.min(1, local / spinSpan), 0.22);

  if (local < dwell) return { m: 0, turns: spun, workT: local, local, cycle };
  const intoMorph = local - dwell;
  if (intoMorph < morph) {
    return { m: morphEase(intoMorph / morph, expo), turns: spun, workT: -1, local, cycle };
  }
  return { m: morphEase(1 - (intoMorph - morph) / morph, expo), turns: spun, workT: -1, local, cycle };
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
    o.dwell ?? 5.5,
    o.morph ?? 1.9,
    o.turns ?? 1,
    o.settle ?? 0.45,
    o.expo ?? 0.3
  );
  const m = b.m;

  const pt = makeProj(TURN * b.turns, (o.tiltAmp ?? 0.34) * (1 - m), cx, cx, R);

  // Both default to zero, which makes this morph identical to the one
  // `listening` runs: every dot on the same eased parameter, straight from
  // where it is to where it is going.
  //
  // They were not always zero, and the difference was the whole reason this
  // transition felt rougher than that one. A per-dot stagger gives every
  // dot its own delayed sub-curve, so the cloud arrives as a smear rather
  // than a movement; the outward bow adds a second, perpendicular motion on
  // top. Both were solving a problem — a knot forming at the centre — that
  // the eased envelope had already solved on its own.
  const stagger = o.stagger ?? 0;
  const arc = o.arc ?? 0;
  const churn = o.churn ?? 0.09;
  const sphereR = o.sphereR ?? 0.92;
  const share = o.haloShare ?? 0.12;
  // The mark's whole moment on screen: one quick swell instead of sitting
  // still. Half a second, and then it is already leaving.

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    // `dotAssembly` layers a second smoothstep on top of an already-eased
    // parameter, which reads as sluggish at both ends. With no stagger
    // asked for, use the envelope's own value — the way every other state
    // does.
    const mi = stagger > 0 ? dotAssembly(i, m, stagger) : m;

    const seat = seats[i];
    const [fx, fy, fz] = fibDir(seat, n);
    // Sphere seats breathe on their own so the dispersed state is alive
    // rather than a frozen ball waiting for its cue — which matters far
    // more now that the orb is where most of the cycle is spent.
    const wob = sphereR * (1 + churn * (vnoise(fx * 2 + t * 0.7, fz * 2) - 0.5) * 2);

    let lx = p[i * 3];
    let ly = p[i * 3 + 1];
    let lz = p[i * 3 + 2];

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
    if (arc > 0) {
      const bow = 1 + arc * Math.sin(Math.PI * mi);
      x *= bow;
      y *= bow;
      z3 *= bow;
    }

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
          (o.haloR ?? 0.22) * halo) *
        rs,
      white: inkOf(o, zx, e[i] * mi + (1 - mi)),
      a: 1 - (o.flightFade ?? 0.25) * travel
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Work: logo → a thread wound into a knot → logo --------------------

/**
 * The mark becomes a single thread that winds itself into a closed knot,
 * one stitch at a time, and unwinds again on the way back.
 *
 * Four solids were tried here and none of them fitted. A ringed planet was
 * the right idea for `orbiting` and inherited by accident; an armillary of
 * rings never cohered; a torus and a toothed orb were stable but joined a
 * crowded family of round things. The mistake was reaching for another
 * OBJECT when what the state needed was an ACT.
 *
 * `generating` supplies the mechanic — a bright head working its way over
 * the form — and this inverts it. There the whole crystal is present and
 * the head colours it in; here the thread does not exist until the head has
 * laid it. One fills a surface, the other draws a line, so the two read as
 * different kinds of labour rather than the same trick twice.
 *
 * The path is a torus knot: a closed curve that never crosses itself, wraps
 * the frame in three dimensions, and looks like nothing else in the set.
 * Winding one is exactly what work looks like.
 */
export const frameLogoWork: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const dwell = o.dwell ?? 5.5;
  const morph = o.morph ?? 1.9;
  const b = beatAt(t, dwell, morph, o.turns ?? 0, o.settle ?? 0.1, o.expo ?? 0.3);
  const m = b.m;
  const c = 1 - m;

  const pt = makeProj(
    (o.lean ?? 0.4) + (o.yawAmp ?? 0.3) * Math.sin(t * (o.yawRate ?? 0.26)) * c,
    (o.tilt ?? 0.4) * c,
    cx,
    cx,
    R
  );

  // Wind across the dwell, hold complete while the mark shows, unwind on
  // the way back — so the cycle reaches its own start with nothing laid,
  // rather than resetting there.
  const into = b.local - dwell;
  const prog =
    b.local < dwell ? b.local / dwell : into < morph ? 1 : clamp01(1 - (into - morph) / morph);
  const head = prog * n;
  const feather = Math.max(1, n * (o.feather ?? 0.02));
  const headW = Math.max(1, n * (o.headWidth ?? 0.01));
  const winding = b.local < dwell;

  // A (p, q) torus knot. Coprime windings are what keep it a single closed
  // curve instead of q separate loops.
  const wraps = o.wraps ?? 3;
  const turns = o.knotTurns ?? 2;
  const major = o.major ?? 0.62;
  const minor = o.minor ?? 0.3;
  const spin = t * (o.spin ?? 0.24);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const u = (seat / n) * TURN;
    const ring = major + minor * Math.cos(turns * u);
    const kx = ring * Math.cos(wraps * u);
    const ky = minor * Math.sin(turns * u);
    const kz = ring * Math.sin(wraps * u);

    const ca = Math.cos(spin);
    const sa = Math.sin(spin);
    const bx = kx * ca + kz * sa;
    const bz = -kx * sa + kz * ca;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const x = lx + (bx - lx) * c;
    const y = ly + (ky - ly) * c;
    const z3 = lz + (bz - lz) * c;

    // Laid or not yet. Unlike `generating`, what is not yet worked is not
    // there at all — the thread grows rather than filling in.
    const laid = clamp01((head - seat) / feather);
    const at = winding ? Math.exp(-(((seat - head) / headW) ** 2)) : 0;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.headR ?? 1.2) * at * c) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) - (o.headInk ?? 0.4) * at * c,
      // Present once laid; absent ahead of the head, never while the mark
      // itself is showing.
      a: 1 - (1 - laid) * c
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
