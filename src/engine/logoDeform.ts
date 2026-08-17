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
import { bell, inkOf, logoWindow, shimmerAt, smootherE } from './logo';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothE(x: number): number {
  return x * x * (3 - 2 * x);
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

// --- shared: an excursion away from the mark and back ------------------

/**
 * The shape both `solving` and `listening` follow: rest as the logo, become
 * something else, do work there, become the logo again.
 *
 * The mark is the state the animation RETURNS to, not one it passes
 * through. An earlier version cycled through a sphere on the way in and out
 * — sphere → cube → solve → mark — and the sphere was pure overhead: an
 * extra form the viewer had to parse, appearing between two forms that
 * already told the whole story.
 */
interface Excursion {
  /** 0 while the logo is showing, 1 while the other form is. */
  c: number;
  /** Time elapsed inside the working phase. */
  work: number;
  /** Progress across the whole away-span, for camera work. */
  away: number;
  /** Time elapsed inside the logo-showing phase, negative once it is over. */
  holdT: number;
}

function excursion(t: number, hold: number, out: number, work: number, back: number): Excursion {
  const cycle = hold + out + work + back;
  const local = t % cycle;
  if (local < hold) return { c: 0, work: 0, away: 0, holdT: local };
  const away = clamp01((local - hold) / (out + work + back));
  const holdT = -1;
  if (local < hold + out) return { c: smoothE((local - hold) / out), work: 0, away, holdT };
  if (local < hold + out + work) return { c: 1, work: local - hold - out, away, holdT };
  return { c: 1 - smoothE((local - hold - out - work) / back), work, away, holdT };
}

/**
 * Camera yaw for an excursion: exactly `turns` whole revolutions across the
 * away-span, eased so velocity is zero at both ends.
 *
 * Whole turns are the point. The mark is only ever shown at yaw 0, because
 * the rotation both starts and finishes on a multiple of 2π — so the logo
 * never spins, while the form it becomes gets all the rotation it needs to
 * read as a solid.
 */
function excursionYaw(away: number, turns: number): number {
  return Math.PI * 2 * turns * smoothE(away);
}

// --- Solving: logo → cube → solve → logo -------------------------------

/** One full cycle, in engine seconds before the preset's speed multiplier. */
const SV_CYCLE = 6.6;

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
 * Timing runs off the same continuous envelope as `thinking`, for the same
 * reason: discrete phases meant the logo sat still, the shimmer switched on
 * as a separate event, switched off, and only then did the cube begin to
 * form. Here the mark is at the envelope's floor and the cube at its crest,
 * so every transition is already in motion before the last one has
 * finished — the shimmer is still fading as the cube starts to gather.
 */
export const frameLogoSolve: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const half = o.cubeHalf ?? 0.62;

  const cycle = o.cycle ?? SV_CYCLE;
  const u = (t % cycle) / cycle;
  const pow = o.bellPow ?? 2.2;
  const level = o.cubeLevel ?? 0.5;
  const env = bell(u, pow);

  // Cube amount: 0 where the mark shows, saturating at 1 across the crest,
  // which is the span the solve gets to run in.
  const c = clamp01(env / level);
  const uLo = logoWindow(level, pow);
  const uHi = 1 - uLo;

  // The palindrome is mapped onto the cube span exactly, so the solve is
  // complete — and nothing is caught mid-rotation — precisely as the cube
  // begins turning back into the mark.
  const moveCount = o.moveCount ?? 5;
  const span = uHi - uLo;
  const solveProgress = clamp01((u - uLo) / span);
  const sc = solveCycle(solveProgress * 2 * moveCount, moveCount, 1, 0);
  const moves = makeCubeMoves(moveCount, half);

  // Rotation advances only while the cube exists, closing on a whole turn,
  // so the mark is shown at yaw 0 and never spins.
  const spun = u < uLo ? 0 : u > uHi ? 1 : smootherE((u - uLo) / span);
  const pt = makeProj(Math.PI * 2 * (o.turns ?? 1) * spun, (o.tiltAmp ?? 0.36) * c, cx, cx, R);

  // The mark's own beat. Its window straddles the cycle boundary — the logo
  // is deepest at u = 0 — so the sweep is measured from a wrapped offset
  // rather than from the raw cycle position.
  const wrapped = u > 0.5 ? u - 1 : u;
  const sweepP = clamp01((wrapped + uLo) / (2 * uLo));
  const glow = clamp01((level - env) / level);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [qx, qy, qz] = cubeSeat(seats[i], n, half);
    const [tx, ty, tz, inActive] = applyMoves([qx, qy, qz], moves, sc);

    const x = p[i * 3] + (tx - p[i * 3]) * c;
    const y = p[i * 3 + 1] + (ty - p[i * 3 + 1]) * c;
    const z3 = p[i * 3 + 2] + (tz - p[i * 3 + 2]) * c;

    const glint = glow > 0 ? shimmerAt(p[i * 3], sweepP, o.shimmerWidth ?? 0.3) * glow : 0;

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
          (inActive ? (o.rActive ?? 0.3) : 0) * c +
          (o.shimmerR ?? 0.55) * glint) *
        rs,
      white: inkOf(o, zx, e[i] * (1 - c) + c) - (o.shimmerInk ?? 0.32) * glint
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Listening: logo → a floating body that bounces → logo -------------

const LS_HOLD = 2;
const LS_OUT = 0.8;
const LS_WORK = 4;
const LS_BACK = 0.8;

/**
 * The mark becomes a single soft volume that pulses vertically, then comes
 * back.
 *
 * Three attempts to get here, and the last two failed in opposite
 * directions. Rolling a wave through the logo by displacing points in depth
 * ghosted the mark across the frame. Laying the dots out as a row of
 * separate meter bars fixed that but went too literal: a bar chart is a
 * diagram, not an object, and it shares nothing with the orbs it sits
 * beside — the logo shattered into fifteen unrelated pieces.
 *
 * What belongs here is one body. A wide, slightly irregular ellipsoid,
 * lit and z-sorted like every other form in this library, whose vertical
 * extent swells and contracts along its width as a travelling wave passes
 * through. The waveform is legible in the silhouette, but it is the
 * silhouette OF something — the dots stay a connected mass, so the state
 * still reads as the mark having become a thing rather than a chart.
 */
export const frameLogoWave: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const ex = excursion(t, o.hold ?? LS_HOLD, o.out ?? LS_OUT, o.work ?? LS_WORK, o.back ?? LS_BACK);
  // Yaw only exists while the body does, and it oscillates rather than
  // accumulating — so it is exactly zero whenever the mark is showing, with
  // no whole-turn bookkeeping needed. Enough parallax to read as 3D, not
  // enough to turn the waveform away from the viewer.
  const pt = makeProj(
    (o.yawAmp ?? 0.42) * Math.sin(t * (o.yawRate ?? 0.55)) * ex.c,
    (o.tiltAmp ?? 0.26) * ex.c,
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

    const c = ex.c;
    const x = p[i * 3] + (bx - p[i * 3]) * c;
    const y = p[i * 3 + 1] + (by - p[i * 3 + 1]) * c;
    const z3 = p[i * 3 + 2] + (bz - p[i * 3 + 2]) * c;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    // Loud columns read brighter, so the pulse is carried by ink as well as
    // by shape — the same way depth is.
    const loud = clamp01(w * 0.5 + 0.5);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.5) * zx + (o.loudR ?? 0.3) * loud * c) * rs,
      white: inkOf(o, zx, e[i] * (1 - c) + c) - (o.loudInk ?? 0.14) * loud * c
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

// --- Breathing: the mark at rest, with a live halo ---------------------

/**
 * A slow pulse, plus a scatter of dots drifting toward and away from the
 * viewer in time with it.
 *
 * The pulse alone was correct but inert — a logo quietly scaling is hard to
 * distinguish from a logo doing nothing. The halo dots are drawn from the
 * mark itself, pushed just outside the silhouette and swung through depth
 * on the breathing frequency. Because the engine carries depth as radius
 * and ink, a dot moving in z alone visibly advances and recedes, which
 * gives the state a foreground and a background without any dot ever
 * landing somewhere that breaks the outline.
 */
export const frameLogoBreathe: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj((o.yawAmp ?? 0.12) * Math.sin(t * 0.28), (o.tiltAmp ?? 0.07) * Math.sin(t * 0.21), cx, cx, R);

  const rate = o.breatheRate ?? 0.85;
  const s = 1 + (o.breathe ?? 0.055) * Math.sin(t * rate);
  const share = o.haloShare ?? 0.13;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    let x = p[i * 3] * s;
    let y = p[i * 3 + 1] * s;
    let z3 = p[i * 3 + 2] * s;
    let halo = 0;

    if (hashD(i, 6.7) < share) {
      // Phase spread so the halo is never all near or all far at once, but
      // still locked to the same frequency as the pulse it belongs to.
      const osc = Math.sin(t * rate + hashD(i, 8.3) * Math.PI * 2);
      halo = 1;
      const out = 1 + (o.haloOut ?? 0.2) * (0.5 + 0.5 * osc);
      x *= out;
      y *= out;
      z3 += (o.haloZ ?? 0.85) * osc;
    }

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.5) * zx + (o.haloR ?? 0.25) * halo) * rs,
      white: inkOf(o, zx, e[i])
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
