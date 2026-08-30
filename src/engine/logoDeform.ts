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

  const b = beatAt(t, o.dwell ?? 5.5, o.morph ?? 1.9, 0, o.settle ?? 0.45, o.expo ?? 0.3);
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
export const frameLogoWait: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const b = beatAt(t, o.dwell ?? 5.5, o.morph ?? 1.9, o.turns ?? 0, o.settle ?? 0.1, o.expo ?? 0.3);
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

// --- Generating: logo → a crystal being stitched → logo ----------------

/** `front` values for {@link frameLogoCrystal}. Numbers, not a union, so the
 *  whole option bag stays capturable by a Reanimated worklet. */
export const FRONT_SPIRAL = 0;
export const FRONT_CAST = 1;
export const FRONT_FACET = 2;
export const FRONT_GROW = 3;
export const FRONT_LATHE = 4;

/**
 * Build order for the octahedron's eight octants, indexed by sign bits
 * (`x<0` + 2·`y<0` + 4·`z<0`).
 *
 * Not 0..7 in order: that walks the bits, which pairs each face with the
 * one across the crystal from it and makes the build hop back and forth
 * through the middle. This sequence takes the four top faces round first,
 * then the four below, so the assembly reads as going around and then down.
 */
const FACET_RANK = [0, 1, 4, 5, 3, 2, 7, 6];

/**
 * The mark becomes a crystal, and a single bright point races over its
 * surface lighting every dot in turn — stitch by stitch, top to bottom.
 * The instant the last one lands, the crystal becomes the logo.
 *
 * The first attempt made this a flat canvas resolving out of noise. The
 * metaphor was right and the object was wrong: every other state here is a
 * solid turning in space, and a flat panel read as a chart that had
 * wandered in. The second kept the crystal but kept the noise too, and the
 * noise ran on its own clock — so the mark would arrive, leave, and a cloud
 * of scattered dots would snap into being from nowhere.
 *
 * There is no noise now. The form is always the crystal; what changes is
 * how much of it has been WORKED. Unstitched dots sit dim and neutral
 * grey, stitched ones carry full ink and the brand's colour, and the head
 * travelling between them is the brightest thing on screen. Generation as
 * something being made, rather than something appearing.
 *
 * The crystal can be cut in five orders, chosen with `front`. They differ
 * in one scalar and nothing else: each answers "when does this dot get
 * made?" and everything downstream — the head, the feather, the unlit grey,
 * the colour — reads that answer without knowing which front produced it.
 *
 * These were once the five variants `generating` shipped, and as a set they
 * failed: five orderings over one unchanging octahedron read as one
 * animation at five speeds, not as five ideas. What varies now is the
 * OBJECT (`logoGenerate.ts`, chosen with `body`), and the fronts are what
 * they always should have been — this one body's own parameter.
 *
 *   spiral  the Fibonacci index itself, which already walks the lattice
 *           pole to pole — an ordering the lattice carries for free
 *   cast    a level plane falling from the top vertex to the bottom, with
 *           the unmade dots held above it so they fall into place
 *   facet   one octant at a time, the crystal assembled from panels
 *   grow    nucleation from a single vertex, outward by angle, like frost
 *   lathe   a meridian sweeping one revolution, laying the surface behind it
 *
 * The unravel matters as much as the stitch. On the way back from the mark
 * the work undoes itself, so the cycle reaches its own start already dark
 * rather than resetting there. Every version that reset at the boundary
 * popped, and a pop is exactly what this whole cycle was reshaped to
 * remove.
 */
export const frameLogoCrystal: ModeFrame = (size, t, o, logo) => {
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

  // Turned enough to show two faces at once: seen straight on an
  // octahedron is a square, which is the one reading to avoid next to a
  // cube.
  const pt = makeProj(
    (o.lean ?? 0.5) + (o.yawAmp ?? 0.24) * Math.sin(t * (o.yawRate ?? 0.32)) * c,
    (o.tilt ?? 0.2) * c,
    cx,
    cx,
    R
  );

  const half = o.crystalR ?? 0.94;
  const spin = t * (o.spin ?? 0.3);

  // Stitch across the dwell, hold complete while the mark is showing, and
  // undo on the way back so the cycle arrives at its own start already
  // dark. Continuous end to end — nothing resets at the boundary.
  const into = b.local - dwell;
  const prog =
    b.local < dwell ? b.local / dwell : into < morph ? 1 : clamp01(1 - (into - morph) / morph);

  // Both are fractions of the whole build, not dot counts, so a front can
  // order the dots however it likes and still be compared against `prog`.
  const feather = Math.max(1e-4, o.feather ?? 0.03);
  const headW = Math.max(1e-4, o.headWidth ?? 0.012);
  const stitching = b.local < dwell;

  const front = o.front ?? FRONT_SPIRAL;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const [ax, ay, az] = fibDir(seat, n);

    // L1 normalisation puts the point on an octahedron; L∞ would put it on
    // a cube, which is the shape `solving` already owns.
    const l1 = Math.max(1e-6, Math.abs(ax) + Math.abs(ay) + Math.abs(az));
    const ca = Math.cos(spin);
    const sa = Math.sin(spin);
    const ox = (ax / l1) * half;
    const oy = (ay / l1) * half;
    const oz = (az / l1) * half;

    // When this dot gets made, in [0, 1]. The only thing the five variants
    // disagree about — everything downstream reads `order` and nothing else.
    let order: number;
    if (front === FRONT_CAST) {
      // A level plane rising from the bottom vertex to the top one.
      //
      // Upward, against the spiral's downward sweep, so the two read as
      // opposites rather than as the same idea at two speeds.
      //
      // This front was first built with the unmade dots held in the air
      // above the plane, falling in as it rose. That is a good description
      // of casting and a bad animation: it dissolves the crystal into
      // grain, and the silhouette — the thing the viewer is meant to keep
      // hold of — goes with it. The comment on this function already said
      // so, having removed a noise cloud once for the same reason. The
      // front carries the difference; nothing moves that did not move before.
      order = clamp01((oy + half) / (2 * half));
    } else if (front === FRONT_FACET) {
      // One octant at a time. The sign bits name the face; the sweep inside
      // it keeps a face from popping in whole, which reads as a cut rather
      // than as work.
      const face = (ax < 0 ? 1 : 0) + (ay < 0 ? 2 : 0) + (az < 0 ? 4 : 0);
      // Each face fills downward across its own half of the crystal, so the
      // whole build reads as one direction rather than eight local ones.
      const within = ay >= 0 ? 1 - oy / half : -oy / half;
      order = clamp01((FACET_RANK[face] + clamp01(within)) / 8);
    } else if (front === FRONT_GROW) {
      // Nucleation: one seed vertex, growing outward by angle. Measured in
      // object space so the growth is anchored to the crystal and the spin
      // carries it round, rather than the front sliding over a turning form.
      const len = Math.max(1e-6, Math.sqrt(ax * ax + ay * ay + az * az));
      order = Math.acos(Math.max(-1, Math.min(1, ax / len))) / Math.PI;
    } else if (front === FRONT_LATHE) {
      // A meridian sweeping one full revolution, laying the surface behind it.
      order = (Math.atan2(az, ax) + Math.PI) / (2 * Math.PI);
    } else {
      // The Fibonacci index itself, which walks the lattice pole to pole in
      // a spiral — an ordering the lattice already carries.
      order = seat / n;
    }

    // Worked or not, and how close the head is right now.
    const done = clamp01((prog - order) / feather);
    const at = stitching ? Math.exp(-(((order - prog) / headW) ** 2)) : 0;

    const bx = ox * ca + oz * sa;
    const bz = -ox * sa + oz * ca;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const x = lx + (bx - lx) * c;
    const y = ly + (oy - ly) * c;
    const z3 = lz + (bz - lz) * c;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    // Weighted by `c` so the dimming belongs to the crystal: the mark
    // itself is never shown half-lit.
    const unlit = (1 - done) * c;
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.headR ?? 1.1) * at * c) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) + (o.unlitInk ?? 0.3) * unlit - (o.headInk ?? 0.4) * at * c,
      // Neutral grey until it has been worked, the brand's colour after.
      k: 1 - unlit
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
