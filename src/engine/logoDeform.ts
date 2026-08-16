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
import { fibDir, finalizeFrame, hashD, makeProj, radiusScale } from './core';
import type { Move } from './lattice';
import { applyMoves, solveCycle } from './lattice';
import { assembleYaw, dotAssembly, inkOf } from './logo';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothE(x: number): number {
  return x * x * (3 - 2 * x);
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

// --- Solving: orb → cube → solve → logo -------------------------------

// The solve gets its own, longer cycle: a scramble that resolves is the
// entire point, and it cannot be rushed into the assemble state's churn.
const S_FORM = 1.1; // sphere rounds into a cube
const S_SOLVE = 4.2; // the cube scrambles and unscrambles
const S_RISE = 1.15; // cube flies apart into the mark
const S_HOLD = 2.2;
const S_FALL = 0.95;
const S_CYCLE = S_FORM + S_SOLVE + S_RISE + S_HOLD + S_FALL;

/**
 * A point on the surface of a cube, from the same Fibonacci index.
 *
 * Pushing a sphere direction out to the cube face — divide by the largest
 * component — keeps the seat assignment identical between the two forms, so
 * the sphere can round into a cube with no re-pairing and no crossing. The
 * distribution bunches slightly toward the corners, which is if anything
 * helpful: it makes the edges read.
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
 * Solving, rebuilt: the mark is never the thing being scrambled.
 *
 * The first attempt applied rubik's slabs directly to the logo, and it did
 * not work — for a reason worth recording. A sphere is equally thick in
 * every axis, so every slab is a real slice and the object looks like
 * itself throughout. A logo is a thin plate with one correct silhouette:
 * slice it and rotate the pieces and within two moves there is no mark
 * left, only debris. The reset then lands on nothing, because the viewer
 * long ago stopped tracking a shape.
 *
 * So the scrambling happens to a CUBE — an object that survives being
 * twisted, because that is what a cube is for — and the logo arrives after
 * it is solved. sphere → cube → scramble → solve → mark. The rubik motion
 * keeps the geometry it was designed for, and the logo keeps its silhouette
 * intact for every frame it is on screen.
 */
export const frameLogoSolve: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const half = o.cubeHalf ?? 0.6;

  const local = t % S_CYCLE;
  // form: 0 at sphere, 1 at cube. assembly: 0 at cube, 1 at mark.
  const form = local < S_FORM ? smoothE(local / S_FORM) : 1;
  let m = 0;
  if (local >= S_FORM + S_SOLVE) {
    const after = local - S_FORM - S_SOLVE;
    if (after < S_RISE) m = smoothE(after / S_RISE);
    else if (after < S_RISE + S_HOLD) m = 1;
    else m = 1 - smoothE((after - S_RISE - S_HOLD) / S_FALL);
  }

  // Only twist while the cube is formed and still whole; once the mark
  // starts arriving the moves unwind so nothing is mid-rotation when the
  // logo lands.
  const solveT = clamp01((local - S_FORM) / S_SOLVE) * S_SOLVE;
  const moveCount = o.moveCount ?? 6;
  const moves = makeCubeMoves(moveCount, half);
  const sc = solveCycle(solveT, moveCount, o.slotDur ?? 0.32, o.rest ?? 0.36);

  // Spin freely while it is a cube, come to rest face-on for the mark —
  // the same closed-form landing the assemble state uses.
  const yaw = assembleYaw(local, o.spin ?? 1.5);
  const tilt = (o.tiltAmp ?? 0.38) * (1 - m);
  const pt = makeProj(yaw, tilt, cx, cx, R);
  const stagger = o.stagger ?? 0.7;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const [sx, sy, sz] = fibDir(seat, n);
    const [qx, qy, qz] = cubeSeat(seat, n, half);
    // sphere → cube
    const bx = sx * (o.sphereR ?? 0.86) + (qx - sx * (o.sphereR ?? 0.86)) * form;
    const by = sy * (o.sphereR ?? 0.86) + (qy - sy * (o.sphereR ?? 0.86)) * form;
    const bz = sz * (o.sphereR ?? 0.86) + (qz - sz * (o.sphereR ?? 0.86)) * form;

    const [tx, ty, tz, inActive] = applyMoves([bx, by, bz], moves, sc);

    // cube → mark
    const mi = dotAssembly(i, m, stagger);
    const x = tx + (p[i * 3] - tx) * mi;
    const y = ty + (p[i * 3 + 1] - ty) * mi;
    const z3 = tz + (p[i * 3 + 2] - tz) * mi;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      // The slab under the wrench brightens, so the eye can follow which
      // face is turning instead of watching the whole solid shimmer.
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (inActive ? (o.rActive ?? 0.3) : 0) * (1 - mi)) * rs,
      white: inkOf(o, zx, e[i] * mi + (1 - mi))
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Listening: the mark bounces; the ripple is light, not shape -------

/**
 * A pulse that never moves a dot out of place.
 *
 * The first version rolled a wave through the mark by displacing points in
 * depth. Under the camera's tilt and yaw a depth offset projects to a
 * screen offset, so alternating bands of the logo slid in opposite
 * directions and the result was a comb — the same mark stamped three or
 * four times across the frame. A logo rendered more than once is worse than
 * no animation at all.
 *
 * The fix is to stop displacing anything. A travelling band modulates only
 * RADIUS and INK, so the silhouette is pixel-stable while a swell of
 * brightness runs across it — which is what a level meter actually looks
 * like. The rhythm comes from a whole-mark bounce instead: the logo drops
 * and recovers on a beat, moving as one rigid object, so it can never
 * ghost against itself.
 */
export const frameLogoWave: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  // Held nearly flat on purpose: with no depth displacement left there is
  // nothing for a strong perspective to reveal, and a still camera keeps
  // the bounce reading as a bounce.
  const pt = makeProj(0, o.tilt ?? 0.05, cx, cx, R);

  const beat = o.beat ?? 1.9;
  // Asymmetric bounce — a quick fall and a slower recovery is what reads as
  // weight. A plain sine reads as floating.
  const ph = (t * beat) % 1;
  const drop = ph < 0.28 ? smoothE(ph / 0.28) : 1 - smoothE((ph - 0.28) / 0.72);
  const bounce = -(o.bounce ?? 0.075) * drop;
  const squash = 1 + (o.squash ?? 0.045) * drop;

  const ripple = o.ripple ?? 0.22;
  const k = o.rippleK ?? 2.6;
  const rate = o.rippleRate ?? 2.4;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const x = p[i * 3];
    const y = p[i * 3 + 1];
    // Band position drives light only. Never geometry.
    const w = Math.sin(y * k - t * rate) * 0.6 + Math.sin(x * k * 0.7 + t * rate * 0.55) * 0.4;
    const lift = clamp01(w * 0.5 + 0.5);
    const [px, py, z] = pt(x / squash, y * squash + bounce, p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.5) + (o.rDepth ?? 1.2) * zx + ripple * lift) * rs,
      white: inkOf(o, zx, e[i]) - (o.rippleInk ?? 0.18) * lift
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Connecting: the mark, fully lit, with wires across it ------------

/**
 * The logo stays the subject; the wiring is an overlay.
 *
 * The first version drew a sparse constellation over the mark held back at
 * a third of its ink, and the mark simply vanished — what you saw was an
 * abstract node graph that happened to sit near a logo. The lesson is the
 * general one for this whole file: the mark is never the thing that gets
 * sacrificed.
 *
 * So the logo now renders at full strength, exactly as `idle` would draw
 * it, and the graph is drawn on top: a handful of hub dots and thin edges
 * that light up in a travelling wave, with packets running them. The mark
 * is readable in every single frame, and the wiring is legible as something
 * happening TO it.
 */
export const frameLogoConnect: ModeFrame = (size, t, o, logo) => {
  if (!logo || !logo.nodes || !logo.edges) return empty();
  const { p, e, n } = logo.points;
  const nodes = logo.nodes;
  const edges = logo.edges;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj(
    (o.yawAmp ?? 0.18) * Math.sin(t * (o.yawRate ?? 0.5)),
    (o.tiltAmp ?? 0.08) * Math.sin(t * 0.38),
    cx,
    cx,
    R
  );

  const dots: Dot[] = [];
  const lines: Line[] = [];

  // The mark, at full presence.
  for (let i = 0; i < n; i++) {
    const [px, py, z] = pt(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.5) + (o.rDepth ?? 1.3) * zx) * rs,
      white: inkOf(o, zx, e[i])
    });
  }

  const nn = nodes.length;
  const nx = new Float64Array(nn);
  const ny = new Float64Array(nn);
  const nz = new Float64Array(nn);
  for (let a = 0; a < nn; a++) {
    const i = nodes[a];
    const [x, y, z] = pt(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    nx[a] = x;
    ny[a] = y;
    nz[a] = z;
  }

  // Edges arrive in a rolling wave so the graph reads as assembling itself
  // continuously rather than blinking.
  const period = o.wirePeriod ?? 3.6;
  const phase = (t % period) / period;
  const edgeCount = edges.length / 2;
  for (let k = 0; k < edgeCount; k++) {
    const a = edges[k * 2];
    const b = edges[k * 2 + 1];
    const own = hashD(k, 2.7);
    const live = clamp01(1 - Math.abs(((phase - own + 1.5) % 1) - 0.5) * (o.wireSharp ?? 3.2));
    if (live <= 0.02) continue;
    lines.push({
      x1: nx[a],
      y1: ny[a],
      x2: nx[b],
      y2: ny[b],
      white: o.lineInk ?? 0.3,
      a: live * (o.lineA ?? 0.8),
      // Floored at just over half a pixel. `rs` scales dot radii
      // sub-linearly, which is right for filled circles but wrong for a
      // stroke: below about 0.5px a line stops being drawn as a line and
      // dissolves into a faint antialiased haze. At 44px the wires had
      // vanished entirely while the numbers still said they were there.
      w: Math.max(0.55, (o.lineW ?? 0.9) * rs)
    });
  }

  // Hubs, sitting proud of the mark.
  for (let a = 0; a < nn; a++) {
    const zx = clamp01((nz[a] + 1) / 2);
    dots.push({
      x: nx[a],
      y: ny[a],
      z: nz[a] + 0.001,
      r: ((o.nodeR ?? 1.15) + (o.nodeRDepth ?? 1.2) * zx) * rs,
      white: 0.22 - 0.16 * zx
    });
  }

  // Packets.
  const signals = o.signals ?? 6;
  for (let s = 0; s < signals; s++) {
    if (!edgeCount) break;
    const k = Math.floor(hashD(s, 9.1) * edgeCount) % edgeCount;
    const a = edges[k * 2];
    const b = edges[k * 2 + 1];
    const f = (t * (o.signalRate ?? 0.6) + hashD(s, 3.3)) % 1;
    const z = nz[a] + (nz[b] - nz[a]) * f;
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: nx[a] + (nx[b] - nx[a]) * f,
      y: ny[a] + (ny[b] - ny[a]) * f,
      z: z + 0.002,
      r: ((o.partR ?? 1.05) + (o.partRDepth ?? 1.1) * zx) * rs,
      white: 0.12 - 0.1 * zx
    });
  }

  return finalizeFrame(dots, lines, o.rMin);
};

// --- Weaving: rows of the mark slide, in sequence ---------------------

/**
 * Discrete rows sliding sideways, offset by a travelling phase.
 *
 * The rotational shear this replaced was smooth, and smooth was the
 * problem: a continuous twist reads as the artwork being warped, which
 * looks like a rendering fault rather than a choice. Quantising into a
 * fixed number of rows makes each one move as a rigid unit, and a rigid
 * unit sliding is unmistakably deliberate — the mark comes apart into
 * strips and knits back together.
 *
 * The camera is held completely still. Rotating while the rows slide gives
 * two competing motions and the eye cannot read either.
 */
export const frameLogoWeave: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj(0, o.tilt ?? 0.06, cx, cx, R);

  const rows = Math.max(3, Math.round(o.rows ?? 9));
  const amp = o.slide ?? 0.3;
  const rate = o.slideRate ?? 1.15;
  // Neighbouring rows lag rather than mirror, so the offsets read as one
  // wave crossing the mark instead of rows fighting each other.
  const lag = o.rowLag ?? 1.5;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const x = p[i * 3];
    const y = p[i * 3 + 1];
    // Row index from y, quantised. Same row ⇒ same offset, always.
    const row = Math.floor(clamp01((y + 1) / 2) * rows);
    // A lag of exactly π is what buys the knit-back: neighbouring rows
    // shear in opposite directions, but every row's offset passes through
    // zero at the same instant, so the mark reassembles completely twice a
    // cycle. Any other lag leaves the rows permanently out of phase and the
    // logo never once appears whole.
    const swing = Math.sin(t * rate - row * lag);
    // Rows rest at zero offset together once per cycle, which is when the
    // mark is whole — the moment the whole state exists to deliver.
    const dx = swing * amp * (0.55 + 0.45 * hashD(row, 3.7));

    const [px, py, z] = pt(x + dx, y, p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.2) * zx) * rs,
      // Rows furthest from home dim slightly, so the knitted-together
      // instant is also the brightest one.
      white: inkOf(o, zx, e[i]) + (o.strayInk ?? 0.1) * Math.abs(swing)
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Breathing: the mark at rest, alive -------------------------------

/** A slow scale-and-ink pulse. The quiet state. */
export const frameLogoBreathe: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj((o.yawAmp ?? 0.14) * Math.sin(t * 0.3), (o.tiltAmp ?? 0.07) * Math.sin(t * 0.23), cx, cx, R);
  const s = 1 + (o.breathe ?? 0.05) * Math.sin(t * (o.breatheRate ?? 0.85));

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [px, py, z] = pt(p[i * 3] * s, p[i * 3 + 1] * s, p[i * 3 + 2] * s);
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
