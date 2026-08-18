// The orb motions, re-aimed at a logo.
//
// The nine orb states are not nine kinds of object — they are nine motion
// fields that happen to have been written against the geometry each one
// generates. Separate the two and the motion is the portable half: a
// function of (position, time) that does not care whether the position came
// from a Fibonacci lattice or a rasterised trademark.
//
// The catch, learned the hard way: a motion that flatters a sphere can
// destroy a logo. A sphere reads correctly from every angle and has no
// silhouette to protect; a mark has exactly one correct appearance. Every
// state here is therefore built around a rule — whatever else happens, the
// viewer must be able to see what the logo IS. Where an orb motion could
// not respect that, it was re-conceived rather than ported.

import type { Dot, Line, ModeFrame, OrbFrame } from './types';
import { fibDir, finalizeFrame, hashD, makeProj, radiusScale, vnoise } from './core';
import type { Move } from './lattice';
import { applyMoves, solveCycle } from './lattice';
import { beatAt, inkOf } from './logo';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothE(x: number): number {
  return x * x * (3 - 2 * x);
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

// --- Solving: a cube being solved, interrupted by the mark -------------

/**
 * A point on the surface of a cube, from a Fibonacci index.
 *
 * Pushing a sphere direction out to the cube face — divide by the largest
 * component — gives an even-ish spread that bunches slightly toward the
 * corners, which is if anything helpful: it makes the edges read.
 */
function cubeSeat(i: number, n: number, half: number): [number, number, number] {
  const [x, y, z] = fibDir(i, n);
  const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) || 1;
  return [(x / m) * half, (y / m) * half, (z / m) * half];
}

/** Quarter-turn slabs sized to the cube, three per axis. */
function makeCubeMoves(count: number, half: number): Move[] {
  const moves: Move[] = [];
  const band = (2 * half) / 3;
  for (let i = 0; i < count; i++) {
    const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3)) as 0 | 1 | 2;
    const lo = -half + band * Math.min(2, Math.floor(hashD(i, 5.9) * 3));
    const dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
    moves.push({ axis, lo, hi: lo + band, ang: (dir * Math.PI) / 2 });
  }
  return moves;
}

/**
 * The mark is never the thing being scrambled — the cube is.
 *
 * Applying rubik's slabs to the logo directly was tried and does not work:
 * a sphere is equally thick in every axis so every slab is a real slice,
 * but a logo is a thin plate with one correct silhouette, and slicing it
 * leaves debris within two moves. The reset then lands on nothing, because
 * the viewer stopped tracking a shape long ago.
 *
 * The solve runs across the dwell, and the palindrome is mapped onto it
 * exactly — so the cube is always back to solved, with nothing caught
 * mid-rotation, at the moment the mark arrives.
 */
export const frameLogoSolve: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const half = o.cubeHalf ?? 0.62;

  const dwell = o.dwell ?? 5.5;
  const b = beatAt(t, dwell, o.morph ?? 1.9, o.turns ?? 1, o.settle ?? 0.45, o.expo ?? 0.3);
  const m = b.m;
  const c = 1 - m;

  const pt = makeProj(Math.PI * 2 * b.turns, (o.tiltAmp ?? 0.36) * c, cx, cx, R);

  // The palindrome fills the dwell and is finished — solved — before the
  // mark begins to gather.
  const moveCount = o.moveCount ?? 6;
  const solveProgress = clamp01(b.workT < 0 ? 1 : b.workT / dwell);
  const sc = solveCycle(solveProgress * 2 * moveCount, moveCount, 1, 0);
  const moves = makeCubeMoves(moveCount, half);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [qx, qy, qz] = cubeSeat(seats[i], n, half);
    const [tx, ty, tz, inActive] = applyMoves([qx, qy, qz], moves, sc);

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const x = lx + (tx - lx) * c;
    const y = ly + (ty - ly) * c;
    const z3 = lz + (tz - lz) * c;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      // The slab under the wrench brightens, so the eye can follow which
      // face is turning instead of watching the whole solid shimmer.
      r:
        ((o.rBase ?? 0.55) +
          (o.rDepth ?? 1.4) * zx +
          (inActive ? (o.rActive ?? 0.3) : 0) * c) *
        rs,
      white: inkOf(o, zx, e[i] * m + (1 - m))
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Listening: a floating body that pulses, interrupted by the mark ---

/**
 * The mark becomes a single soft volume that pulses vertically, then comes
 * back.
 *
 * Three attempts to get here, and the last two failed in opposite
 * directions. Rolling a wave through the logo by displacing points in depth
 * ghosted the mark across the frame, because a depth offset projects to a
 * screen offset under any camera tilt. Laying the dots out as a row of
 * separate meter bars fixed that but went too literal: a bar chart is a
 * diagram, not an object, and it shares nothing with the orbs it sits
 * beside — the logo shattered into fifteen unrelated pieces.
 *
 * What belongs here is one body. A wide, slightly irregular ellipsoid, lit
 * and z-sorted like every other form in this library, whose vertical extent
 * swells and contracts along its width as a travelling wave passes through.
 * The waveform is legible in the silhouette, but it is the silhouette OF
 * something.
 */
export const frameLogoWave: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const b = beatAt(t, o.dwell ?? 4, o.morph ?? 1.9, 0, o.settle ?? 0.45, o.expo ?? 0.3);
  const m = b.m;
  const c = 1 - m;

  // Yaw oscillates rather than accumulating and is scaled by the body
  // amount, so it is exactly zero whenever the mark is showing, with no
  // whole-turn bookkeeping needed. Enough parallax to read as 3D, not
  // enough to turn the waveform away from the viewer.
  const pt = makeProj(
    (o.yawAmp ?? 0.42) * Math.sin(t * (o.yawRate ?? 0.55)) * c,
    (o.tiltAmp ?? 0.26) * c,
    cx,
    cx,
    R
  );

  // Wider than tall: the shape of a waveform, and the shape that leaves the
  // vertical pulse room to read.
  const wide = o.wide ?? 1.12;
  const tall = o.tall ?? 0.5;
  const k1 = o.waveK ?? 3.1;
  const k2 = o.waveK2 ?? 6.7;
  const rate = o.waveRate ?? 1.9;
  const swing = o.swing ?? 0.52;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [fx, fy, fz] = fibDir(seats[i], n);

    // Two harmonics so the profile never resolves into a clean sine — real
    // audio does not, and a single frequency reads as a decorative ripple.
    const w = Math.sin(fx * k1 - t * rate) * 0.62 + Math.sin(fx * k2 + t * rate * 0.55) * 0.38;
    const amp = 1 + swing * w;
    // A slow noise field on the radius keeps the body from reading as a
    // perfect ellipsoid — it should look like a soft mass, not a primitive.
    const lumpy = 1 + (o.lumps ?? 0.12) * (vnoise(fx * 2 + t * 0.35, fz * 2) - 0.5) * 2;

    const bx = fx * wide * lumpy;
    const by = fy * tall * lumpy * amp;
    const bz = fz * wide * lumpy;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const x = lx + (bx - lx) * c;
    const y = ly + (by - ly) * c;
    const z3 = lz + (bz - lz) * c;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    // Loud columns read brighter, so the pulse is carried by ink as well as
    // by shape — the same way depth is.
    const loud = clamp01(w * 0.5 + 0.5);
    dots.push({
      x: px,
      y: py,
      z,
      r:
        ((o.rBase ?? 0.55) +
          (o.rDepth ?? 1.5) * zx +
          (o.loudR ?? 0.3) * loud * c) *
        rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) - (o.loudInk ?? 0.14) * loud * c
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Breathing: logo → a bellows of stacked rings → logo ---------------

/**
 * The mark becomes a barrel of stacked rings that draws tall and narrow,
 * then settles short and wide.
 *
 * Two versions failed for opposite reasons. Pulsing the logo a few percent
 * in place was invisible at icon size. A deformed sphere was visible but
 * shared its whole silhouette with `thinking`'s orb — the motions differed
 * and the shapes did not, which at a glance is the same thing as having one
 * state twice.
 *
 * Stacked rings are structurally different from every other form here:
 * open, layered, and obviously made of parts. And the pulse is not a scale
 * — height and radius move in OPPOSITE directions, so the volume stays
 * roughly constant and the object reads as something drawing air rather
 * than something being zoomed. That antiphase is the whole trick; a body
 * that simply grows and shrinks reads as a beating heart, not a breath.
 */
export const frameLogoBreathe: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const b = beatAt(t, o.dwell ?? 4, o.morph ?? 1.9, o.turns ?? 0, o.settle ?? 0.1, o.expo ?? 0.3);
  const m = b.m;
  const c = 1 - m;

  // Held tilt, so the rings always read as a stack of ellipses. Seen
  // straight on they collapse into concentric circles and the layering —
  // the thing that makes this not a ball — disappears.
  const pt = makeProj(
    (o.yawAmp ?? 0.22) * Math.sin(t * (o.yawRate ?? 0.3)) * c,
    (o.tilt ?? 0.42) * c,
    cx,
    cx,
    R
  );

  const rings = Math.max(3, Math.round(o.rings ?? 9));
  const perRing = Math.ceil(n / rings);
  // Antiphase: in as it lengthens, out as it widens.
  const breath = Math.sin(t * (o.breatheRate ?? 0.75));
  const amp = o.breatheAmp ?? 0.2;
  const height = (o.height ?? 1.5) * (1 + amp * breath);
  const wide = (o.wide ?? 0.82) * (1 - amp * 0.72 * breath);
  const spin = t * (o.spin ?? 0.16);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const ring = seat % rings;
    const u = rings > 1 ? ring / (rings - 1) - 0.5 : 0;

    // Barrel profile: widest at the middle, tapering at both ends, so the
    // stack has a body rather than reading as a cylinder.
    const taper = Math.cos(u * Math.PI * (o.taper ?? 0.78));
    const rad = wide * taper;
    const ang = (Math.floor(seat / rings) / perRing) * Math.PI * 2 + spin;

    const bx = Math.cos(ang) * rad;
    const by = u * height;
    const bz = Math.sin(ang) * rad;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const x = lx + (bx - lx) * c;
    const y = ly + (by - ly) * c;
    const z3 = lz + (bz - lz) * c;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    // The widest rings read brightest, so the exhale is carried by ink as
    // well as by shape.
    const loud = clamp01(taper);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.loudR ?? 0.25) * loud * c) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) - (o.loudInk ?? 0.12) * loud * c
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
