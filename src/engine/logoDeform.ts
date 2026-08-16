// The orb motions, re-aimed at a logo.
//
// The nine orb states are not nine kinds of object — they are nine motion
// fields that happen to have been written against the geometry each one
// generates. `frameRubik` builds a lat/long lattice AND twists it; `frameWave`
// builds rings AND rolls a waveform through them. Separate the two and the
// motion is revealed as the portable half: a function of (position, time)
// that does not care whether the position came from a Fibonacci lattice or
// from a rasterised trademark.
//
// So these modes reuse the ORIGINAL solver and timing from `lattice.ts`
// rather than reimplementing them. That matters more than it looks: a
// second copy of the rubik cycle would drift out of step with the orb
// version on the first tuning change, and a product showing both would
// have two subtly different heartbeats.

import type { Dot, Line, LogoBinding, ModeFrame, OrbFrame } from './types';
import { finalizeFrame, hashD, makeProj, radiusScale, vnoise } from './core';
import type { Move } from './lattice';
import { applyMoves, solveCycle } from './lattice';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

function ink(o: Record<string, number | undefined>, zx: number, edge: number): number {
  return (o.inkFar ?? 0.6) - (o.inkSpan ?? 0.5) * zx - (o.inkRim ?? 0.16) * (1 - edge);
}

// --- Solving: the mark scrambles in quarter turns, then clicks back ----

/**
 * Slabs for a plate, not for a cube.
 *
 * `makeMoves` picks its rotation axis uniformly, which is correct for a
 * sphere — a sphere is equally thick in x, y and z, so every axis cuts a
 * meaningful slab. A logo is a thin plate: it spans the full width in x and
 * y but only a fraction of that in z. A z-axis move therefore selects
 * EVERY point into one slab and spins the entire mark in the picture plane,
 * which is a different animation wearing this one's clothes.
 *
 * So the axis is restricted to x and y, where a slab is a genuine strip of
 * the artwork — a vertical column tumbling forward, a horizontal band
 * turning about the upright. That is what makes the state read as machinery
 * operating on the mark rather than the mark being shaken.
 */
function makeLogoMoves(count: number): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const axis = (hashD(i, 2.3) < 0.5 ? 0 : 1) as 0 | 1;
    const lo = -1.0 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
    const dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
    moves.push({ axis, lo, hi: lo + 0.5, ang: (dir * Math.PI) / 2 });
  }
  return moves;
}

/**
 * Rubik's motion, applied to the logo.
 *
 * Because the cycle is a palindrome the mark always resolves back to itself
 * exactly, and that reset is the whole effect: scrambling alone reads as
 * corruption, scrambling that lands reads as a machine finishing a job.
 *
 * The move count is deliberately far below rubik's fourteen. Every move
 * that is still open composes with the next one, and past about five
 * simultaneous rotations a flat mark has been folded through itself enough
 * times that no silhouette survives — what the viewer sees is debris, and
 * the payoff of the reset is lost because there was nothing left to root
 * for. A sphere tolerates fourteen because it looks like a sphere from
 * every angle; a logo does not.
 */
export const frameLogoSolve: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  // Yaw stays a shallow oscillation, not a spin: the payoff of this state
  // is watching the mark come back together, which needs it kept readable.
  const pt = makeProj(
    (o.yawAmp ?? 0.3) * Math.sin(t * (o.yawRate ?? 0.5)),
    (o.tiltAmp ?? 0.14) * Math.sin(t * 0.42),
    cx,
    cx,
    R
  );

  const moveCount = o.moveCount ?? 4;
  const moves = makeLogoMoves(moveCount);
  const sc = solveCycle(t, moveCount, o.slotDur ?? 0.42, o.rest ?? 1.2);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y, z3, inActive] = applyMoves([p[i * 3], p[i * 3 + 1], p[i * 3 + 2]], moves, sc);
    const [px, py, z] = pt(x, y, z3);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      // The band being turned right now brightens, so the eye can follow
      // which slab is moving instead of watching the whole mark shimmer.
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (inActive ? (o.rActive ?? 0.35) : 0)) * rs,
      white: ink(o, zx, e[i])
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Listening: a waveform rolls through the mark ----------------------

/**
 * A travelling wave, displacing points in depth rather than sideways.
 *
 * Displacing in x or y would deform the silhouette — the mark would visibly
 * wobble out of shape, which is a defect, not an animation. Pushing along z
 * leaves the outline exactly where it is and lets the engine's depth cue do
 * the work: the crest swells and brightens, the trough recedes, and the
 * logo stays perfectly itself throughout.
 */
export const frameLogoWave: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj((o.yawAmp ?? 0.26) * Math.sin(t * 0.4), o.tilt ?? 0.22, cx, cx, R);

  const amp = o.waveAmp ?? 0.4;
  const k = o.waveK ?? 3.4;
  const speed = o.waveRate ?? 2.2;
  // A second, slower wave crossing the first keeps it from reading as a
  // metronome — voice is not periodic and neither should this look.
  const k2 = o.waveK2 ?? 1.7;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const x = p[i * 3];
    const y = p[i * 3 + 1];
    const w = Math.sin(y * k - t * speed) * 0.7 + Math.sin(x * k2 + t * speed * 0.6) * 0.3;
    const [px, py, z] = pt(x, y, p[i * 3 + 2] + w * amp);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.5) + (o.rDepth ?? 1.6) * zx) * rs,
      white: ink(o, zx, e[i])
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Connecting: the mark wires itself, packets running the edges ------

/**
 * The constellation state, drawn over the logo's own points.
 *
 * Nodes and edges are chosen at resolve time (see `buildGraph`) because
 * picking well-spread nodes needs a farthest-point pass and the edge test
 * is quadratic — neither belongs in a function that runs sixty times a
 * second. What is left per frame is a lerp along each edge, which is
 * exactly the kind of arithmetic the engine is built for.
 *
 * The full cloud stays visible underneath at low ink, so the mark reads as
 * the thing being wired rather than disappearing behind a lattice.
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
    (o.yawAmp ?? 0.3) * Math.sin(t * (o.yawRate ?? 0.55)),
    (o.tiltAmp ?? 0.12) * Math.sin(t * 0.4),
    cx,
    cx,
    R
  );

  const dots: Dot[] = [];
  const lines: Line[] = [];
  const ghostA = o.ghostA ?? 0.34;

  // the mark itself, held back
  for (let i = 0; i < n; i++) {
    const [px, py, z] = pt(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: (o.ghostR ?? 0.75) * rs,
      white: ink(o, zx, e[i]),
      a: ghostA
    });
  }

  // Project each node once; the edge pass and the packet pass both need it.
  const nn = nodes.length;
  const px = new Float64Array(nn);
  const py = new Float64Array(nn);
  const pz = new Float64Array(nn);
  for (let a = 0; a < nn; a++) {
    const i = nodes[a];
    const [x, y, z] = pt(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    px[a] = x;
    py[a] = y;
    pz[a] = z;
  }

  // Edges light up in a rolling wave rather than all at once, so the
  // constellation reads as assembling itself continuously.
  const period = o.wirePeriod ?? 4.2;
  const phase = (t % period) / period;
  const edgeCount = edges.length / 2;
  for (let k = 0; k < edgeCount; k++) {
    const a = edges[k * 2];
    const b = edges[k * 2 + 1];
    const own = hashD(k, 2.7);
    const live = clamp01(1 - Math.abs(((phase - own + 1.5) % 1) - 0.5) * (o.wireSharp ?? 3.4));
    if (live <= 0.02) continue;
    const zx = clamp01((((pz[a] + pz[b]) / 2 + 1) / 2));
    lines.push({
      x1: px[a],
      y1: py[a],
      x2: px[b],
      y2: py[b],
      white: 0.5 - 0.3 * zx,
      a: live * (o.lineA ?? 0.7),
      w: (o.lineW ?? 0.8) * rs
    });
  }

  // nodes
  for (let a = 0; a < nn; a++) {
    const zx = clamp01((pz[a] + 1) / 2);
    dots.push({
      x: px[a],
      y: py[a],
      z: pz[a],
      r: ((o.nodeR ?? 1.1) + (o.nodeRDepth ?? 1.4) * zx) * rs,
      white: 0.3 - 0.22 * zx
    });
  }

  // packets running the edges
  const signals = o.signals ?? 5;
  for (let s = 0; s < signals; s++) {
    if (!edgeCount) break;
    const k = Math.floor(hashD(s, 9.1) * edgeCount) % edgeCount;
    const a = edges[k * 2];
    const b = edges[k * 2 + 1];
    const f = (t * (o.signalRate ?? 0.55) + hashD(s, 3.3)) % 1;
    const x = px[a] + (px[b] - px[a]) * f;
    const y = py[a] + (py[b] - py[a]) * f;
    const z = pz[a] + (pz[b] - pz[a]) * f;
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x,
      y,
      z,
      r: ((o.partR ?? 1) + (o.partRDepth ?? 1.2) * zx) * rs,
      white: 0.22 - 0.18 * zx
    });
  }

  return finalizeFrame(dots, lines, o.rMin);
};

// --- Weaving: strands of the mark drift and re-knit --------------------

/**
 * Points swirl around the mark's own centre and settle back, in bands.
 *
 * The orb's braid state plaits three strands around a sphere, which has no
 * meaning for arbitrary artwork — there is no axis to plait around. What
 * carries over is the READ of it: material in motion that stays coherent.
 * Here each dot rotates about the centre by an amount that varies with its
 * radius, so the mark shears into ribbons and unwinds back, and the outer
 * dots travel furthest exactly as they do on a braid.
 */
export const frameLogoWeave: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pt = makeProj((o.yawAmp ?? 0.24) * Math.sin(t * 0.45), (o.tiltAmp ?? 0.12) * Math.sin(t * 0.33), cx, cx, R);
  const shear = o.shear ?? 1.15;
  const rate = o.shearRate ?? 0.85;

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = p[i * 3];
    const y0 = p[i * 3 + 1];
    const rad = Math.hypot(x0, y0);
    // Shear amount oscillates through zero, so the mark passes through
    // perfectly readable twice per cycle instead of never.
    const a = Math.sin(t * rate) * shear * rad;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const [pxv, pyv, z] = pt(x0 * ca - y0 * sa, x0 * sa + y0 * ca, p[i * 3 + 2]);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: pxv,
      y: pyv,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx) * rs,
      white: ink(o, zx, e[i])
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Breathing: the mark at rest, alive -------------------------------

/** A slow scale-and-ink pulse with a drifting noise field. The quiet state. */
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
    const x = p[i * 3];
    const y = p[i * 3 + 1];
    // A slow noise field moves ink around the mark without moving a single
    // dot, so it shimmers while staying pin-sharp.
    const shimmer = (vnoise(x * 2 + t * 0.3, y * 2) - 0.5) * (o.shimmer ?? 0.12);
    const [pxv, pyv, z] = pt(x * s, y * s, p[i * 3 + 2] * s);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: pxv,
      y: pyv,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx) * rs,
      white: ink(o, zx, e[i]) + shimmer
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
