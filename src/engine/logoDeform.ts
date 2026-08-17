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
import { inkOf } from './logo';

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
}

function excursion(t: number, hold: number, out: number, work: number, back: number): Excursion {
  const cycle = hold + out + work + back;
  const local = t % cycle;
  if (local < hold) return { c: 0, work: 0, away: 0 };
  const away = clamp01((local - hold) / (out + work + back));
  if (local < hold + out) return { c: smoothE((local - hold) / out), work: 0, away };
  if (local < hold + out + work) return { c: 1, work: local - hold - out, away };
  return { c: 1 - smoothE((local - hold - out - work) / back), work, away };
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

const SV_HOLD = 1.3;
const SV_OUT = 0.75;
const SV_WORK = 3;
const SV_BACK = 0.75;

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
 * So the logo becomes a cube — an object that survives being twisted,
 * because that is what a cube is for — the cube is solved, and the logo
 * comes back. The rotation is confined to the cube: it is exactly one whole
 * turn across the away-span, so the mark itself is only ever shown square
 * to the viewer and never spins.
 */
export const frameLogoSolve: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const half = o.cubeHalf ?? 0.62;

  const ex = excursion(t, o.hold ?? SV_HOLD, o.out ?? SV_OUT, o.work ?? SV_WORK, o.back ?? SV_BACK);
  const pt = makeProj(
    excursionYaw(ex.away, o.turns ?? 1),
    (o.tiltAmp ?? 0.36) * ex.c,
    cx,
    cx,
    R
  );

  // Five moves scrambling and unscrambling inside the working phase, so the
  // palindrome completes exactly as the cube starts turning back into the
  // mark — nothing is ever caught mid-rotation when the logo lands.
  const moveCount = o.moveCount ?? 5;
  const moves = makeCubeMoves(moveCount, half);
  const slot = (o.work ?? SV_WORK) / (2 * moveCount);
  const sc = solveCycle(ex.work, moveCount, slot, 0);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [qx, qy, qz] = cubeSeat(seats[i], n, half);
    const [tx, ty, tz, inActive] = applyMoves([qx, qy, qz], moves, sc);

    const c = ex.c;
    const x = p[i * 3] + (tx - p[i * 3]) * c;
    const y = p[i * 3 + 1] + (ty - p[i * 3 + 1]) * c;
    const z3 = p[i * 3 + 2] + (tz - p[i * 3 + 2]) * c;

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      // The slab under the wrench brightens, so the eye can follow which
      // face is turning instead of watching the whole solid shimmer.
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (inActive ? (o.rActive ?? 0.3) : 0) * c) * rs,
      white: inkOf(o, zx, e[i] * (1 - c) + c)
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Listening: logo → level meter → logo ------------------------------

const LS_HOLD = 1.2;
const LS_OUT = 0.7;
const LS_WORK = 2.8;
const LS_BACK = 0.7;

/**
 * The mark folds into a row of bars, the bars move like a level meter, and
 * the mark comes back.
 *
 * Two earlier attempts failed in instructive ways. Rolling a wave through
 * the logo by displacing points in depth stamped the mark three or four
 * times across the frame, because a depth offset projects to a screen
 * offset under any camera tilt. Modulating only radius and ink fixed the
 * ghosting but left the state reading as a shimmer — nothing about it said
 * *audio*.
 *
 * A level meter says audio instantly, and it is a shape the mark can
 * actually become: the same dots, re-laid as columns. Bar assignment is
 * spatial (see `buildBars`), so the logo folds into the meter rather than
 * shuffling into it.
 */
export const frameLogoWave: ModeFrame = (size, t, o, logo) => {
  if (!logo || !logo.bar || !logo.slot) return empty();
  const { p, e, n } = logo.points;
  const bar = logo.bar;
  const slot = logo.slot;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const ex = excursion(t, o.hold ?? LS_HOLD, o.out ?? LS_OUT, o.work ?? LS_WORK, o.back ?? LS_BACK);
  // The meter is read head-on, like a meter. No rotation at all.
  const pt = makeProj(0, (o.tilt ?? 0.04) * ex.c, cx, cx, R);

  const bars = Math.max(2, Math.round(o.bars ?? 15));
  const spread = o.spread ?? 0.92;
  const barW = (2 * spread) / bars;
  const rate = o.barRate ?? 3.4;
  const floorH = o.barFloor ?? 0.22;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const b = bar[i];
    // Each bar breathes on its own frequency and phase. Shared timing reads
    // as a graphic equaliser demo; independent timing reads as a signal.
    const wob =
      0.5 +
      0.5 *
        Math.sin(t * rate * (0.6 + hashD(b, 1.3) * 0.9) + hashD(b, 4.7) * 6.28) *
        Math.sin(t * rate * 0.37 + hashD(b, 8.1) * 6.28);
    const h = floorH + (1 - floorH) * wob;

    // Jitter inside the column so a bar reads as a bar with width, not as a
    // one-dot-wide line.
    const jx = (hashD(i, 2.1) - 0.5) * barW * (o.barFill ?? 0.62);
    const bx = ((b + 0.5) / bars - 0.5) * 2 * spread + jx;
    const by = (slot[i] - 0.5) * 2 * h * (o.barHeight ?? 0.85);

    const c = ex.c;
    const x = p[i * 3] + (bx - p[i * 3]) * c;
    const y = p[i * 3 + 1] + (by - p[i * 3 + 1]) * c;
    const z3 = p[i * 3 + 2] * (1 - c);

    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      // Taller bars read louder.
      r: ((o.rBase ?? 0.52) + (o.rDepth ?? 1.2) * zx + (o.loudR ?? 0.35) * h * c) * rs,
      white: inkOf(o, zx, e[i] * (1 - c) + c) - (o.loudInk ?? 0.16) * h * c
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
