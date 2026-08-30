// Generating: a body being realised, and the front where the work is.
//
// Three attempts to get here. Five build ORDERS over one octahedron changed
// nothing you could see — the object never varied, so they read as one
// animation at five speeds. Five objects that GREW OUT OF NOTHING fixed
// that and broke something worse: for most of the cycle there was no object
// on screen, only the fraction built so far, which is a progress bar drawn
// in perspective.
//
// What generation looks like is two things:
//
//   the body   a real 3D form, present and legible for the WHOLE cycle,
//              turning in space. It is never partly there. What changes is
//              how much of it has been realised, carried by ink and colour
//              — dim neutral grey where the work has not reached, full
//              brand colour where it has.
//   the front  where the work is right now: the brightest point in the
//              frame, travelling over the body in the body's own order.
//
// Loose matter flying in to feed the front was tried twice and cut twice.
// Phased along shared paths it grew tails; flying independently it was a
// scatter of specks crossing the frame. Both times the cost was the same: a
// second thing moving, at a different speed, in front of the thing the
// viewer is meant to watch. It survives as `swarm`, off by default.
//
// WHAT COUNTS AS A BODY. Two rules, both learned by breaking them.
//
// Not an object. A vessel, a tower, a cog, a tree, a coiled shell all
// animated well and are gone. A spinner is a mark and an abstraction of
// loading; the moment the form is a recognisable OBJECT the viewer reads a
// picture of that object, wonders what a pot has to do with the product,
// and the mark is the second thing they looked at.
//
// Not a wire. A möbius band, a double helix, nested hoops, a trefoil, a
// spiral disc — every one of them is a LINE drawn in space, and a line has
// no volume to work on. What this state is about is matter being resolved:
// something coarse becoming something finished, the way an image resolves
// out of noise. That needs a body with an inside and a surface, so the
// front has something to move THROUGH rather than merely along.

import type { Dot, ModeFrame, OrbFrame } from './types';
import { fibDir, finalizeFrame, frac, hashD, makeProj, radiusScale } from './core';
import { beatAt, inkOf } from './logo';

const TAU = Math.PI * 2;

/**
 * `body` values for {@link frameLogoGenerate} — the form being realised.
 * Numbers rather than a union, so the whole option bag stays capturable by
 * a Reanimated worklet.
 */
export const BODY_LATTICE = 0;
export const BODY_DIFFUSION = 1;
export const BODY_VOXEL = 2;
export const BODY_RASTER = 3;
export const BODY_SHELLS = 4;
export const BODY_YARN = 5;
export const BODY_TORUS = 6;
export const BODY_CRYSTAL = 7;
/** How many bodies exist. */
export const BODY_COUNT = 8;

/**
 * Camera per body: lean, tilt, yaw amplitude, yaw rate — four numbers each,
 * flat, in `body` order.
 *
 * Not one shared camera, because the camera is half of whether a form reads
 * at all: a torus seen face on is a flat ring, a helix under any real tilt
 * crosses itself into a braid, and an octahedron square to the viewer is a
 * square. Not per-body option keys either — that would be forty names in a
 * bag every body has to ignore.
 */
const CAMERAS = [
  0.4, 0.3, 0.3, 0.28, // lattice
  0.3, 0.28, 0.3, 0.24, // diffusion
  0.45, 0.32, 0.28, 0.24, // voxel — a corner toward the viewer, so it has depth
  0.2, 0.26, 0.26, 0.22, // raster — near square on: it is being drawn AT you
  0.3, 0.3, 0.3, 0.26, // shells
  0.2, 0.28, 0.3, 0.26, // yarn
  0.0, 0.52, 0.2, 0.24, // torus — face on it is a ring, not a solid
  0.5, 0.2, 0.24, 0.32 // crystal — two faces at once, never square on
];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

/**
 * `generating`: one body, realised under a travelling front.
 *
 * The body switch sits inside the per-dot loop rather than around it. Ten
 * frame functions would be ten copies of the clock, the morph and the ink
 * language, and the last time this file held one function per variant they
 * had already started to disagree.
 */
const frameBuild: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const body = Math.max(0, Math.min(BODY_COUNT - 1, Math.round(o.body ?? BODY_CRYSTAL)));

  const dwell = o.dwell ?? 5.5;
  const morph = o.morph ?? 1.9;
  const b = beatAt(t, dwell, morph, 0, o.settle ?? 0.1, o.expo ?? 0.3);
  const m = b.m;
  const c = 1 - m;

  // Work runs across the dwell, holds while the mark shows, and undoes
  // itself on the way back, so the cycle arrives at its own start already
  // dark instead of resetting there. Every version that reset popped.
  const into = b.local - dwell;
  const prog =
    b.local < dwell ? b.local / dwell : into < morph ? 1 : clamp01(1 - (into - morph) / morph);
  const working = b.local < dwell;

  const cam = body * 4;
  // EVERY camera term is weighted by `c`, the lean included. A held lean is
  // what a body needs to read as a solid, and it is exactly wrong on the
  // mark: the artwork is a flat plate, so any yaw still standing when the
  // logo lands foreshortens it horizontally. At the leans here that is a 4
  // to 12 per cent narrowing — small enough to look like a squashed logo
  // rather than like a bug, which is worse.
  const pt = makeProj(
    ((o.lean ?? CAMERAS[cam]) +
      (o.yawAmp ?? CAMERAS[cam + 2]) * Math.sin(t * (o.yawRate ?? CAMERAS[cam + 3]))) *
      c,
    (o.tilt ?? CAMERAS[cam + 1]) * c,
    cx,
    cx,
    R
  );

  // Matter flying in to feed the front: off by default, see the note at the
  // top. When it is on, these dots come off the end of the seat permutation,
  // which takes an even scatter of the mark rather than one region of it.
  const share = clamp01(o.swarm ?? 0);
  const objN = share > 0 ? Math.max(8, Math.round(n * (1 - share))) : n;
  const parts = Math.max(1, n - objN);
  const streams = Math.max(2, Math.min(12, Math.round(o.streams ?? 6)));

  const spin = t * (o.spin ?? (body === BODY_CRYSTAL ? 0.3 : 0.16));
  const feather = Math.max(1e-4, o.feather ?? 0.035);
  const headW = Math.max(1e-4, o.headWidth ?? 0.02);

  // --- body constants, resolved once ------------------------------------
  const crystalR = o.crystalR ?? 0.92;

  const majorN = Math.max(6, Math.round(o.majorN ?? 22));
  const perMajor = Math.max(1, Math.ceil(objN / majorN));

  const shells = Math.max(3, Math.round(o.shells ?? 5));
  const perShell = Math.max(2, Math.ceil(objN / shells));

  const rows = Math.max(6, Math.round(o.rasterRows ?? 15));
  const perRow = Math.max(2, Math.ceil(objN / rows));

  // Four needles rather than one. The winding count is what closes the ball,
  // but it is also how far the front has to travel: at thirty-four laps in
  // one dwell the bright point was a streak going up and down the sphere,
  // which is a machine spinning, not a hand stitching. Splitting the same
  // coverage across parallel strands keeps the surface closed while the
  // front crawls — each strand carries a quarter of the laps.
  const strands = Math.max(1, Math.round(o.strands ?? 4));
  const perStrand = Math.max(2, Math.ceil(objN / strands));

  // Scratch. This runs once per dot per frame and a returned tuple here is
  // the hottest allocation in the library.
  const at3 = [0, 0, 0];

  /** Turn `at3` about the vertical axis by the body's own spin. */
  function turn(): void {
    const ca = Math.cos(spin);
    const sa = Math.sin(spin);
    const x = at3[0];
    at3[0] = x * ca + at3[2] * sa;
    at3[2] = -x * sa + at3[2] * ca;
  }

  /**
   * Where dot `idx` sits on the body → `at3`; returns when it is realised,
   * in [0, 1].
   */
  function seatOn(idx: number): number {
    if (body === BODY_LATTICE) {
      // The orb quantised onto a grid: the same dots the sphere would have,
      // snapped to cells, so it reads as something rendered rather than as
      // a surface that was always smooth.
      const q = o.cell ?? 0.17;
      const [x, y, z] = fibDir(idx, objN);
      const rr = 0.9;
      at3[0] = Math.round((x * rr) / q) * q;
      at3[1] = Math.round((y * rr) / q) * q;
      at3[2] = Math.round((z * rr) / q) * q;
      turn();
      // A flat wavefront on the diagonal, so cells resolve in sheets.
      return clamp01((at3[0] + at3[1] + at3[2] + 3 * rr) / (6 * rr));
    }

    if (body === BODY_DIFFUSION) {
      // The orb resolving out of noise — what an image model actually does,
      // and the reason this state exists.
      //
      // Unresolved dots do not sit on the body: they sit in a cloud AROUND
      // where they belong, drifting, and the front pulls each one onto its
      // exact seat as it passes. So the form is legible from the first frame
      // as a haze with a shape, and sharpens rather than appears.
      const [x, y, z] = fibDir(idx, objN);
      const rr = o.orbR ?? 0.86;
      at3[0] = x * rr;
      at3[1] = y * rr;
      at3[2] = z * rr;
      turn();
      // Ordered by depth along one axis so the sharpening sweeps the body
      // rather than speckling it — a random order reads as dots switching
      // on, which is a loading dot animation, not a resolve.
      return clamp01((at3[1] + rr) / (2 * rr));
    }

    if (body === BODY_VOXEL) {
      // A solid, not a shell: cells fill the inside as well as the surface,
      // so the diagonal front cuts THROUGH the body and you see it arrive at
      // the far corner. The lattice's sphere is hollow; this is the same
      // idea with a middle.
      const q = o.voxel ?? 0.2;
      // A low-discrepancy triple, so the cells are hit evenly instead of in
      // the stripes a single golden ratio produces in three dimensions.
      let vx = frac(idx * 0.7548776662) * 2 - 1;
      let vy = frac(idx * 0.5698402909) * 2 - 1;
      let vz = frac(idx * 0.3568324) * 2 - 1;
      // Fold the cube into the ball: cells outside pull back along their own
      // direction, which keeps the grid intact where clipping would leave a
      // sphere of dust with a hole in it.
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      const keep = Math.min(1, 0.92 / len);
      vx *= keep;
      vy *= keep;
      vz *= keep;
      at3[0] = Math.round(vx / q) * q;
      at3[1] = Math.round(vy / q) * q;
      at3[2] = Math.round(vz / q) * q;
      turn();
      return clamp01((at3[0] + at3[1] + at3[2] + 2.76) / 5.52);
    }

    if (body === BODY_RASTER) {
      // The orb drawn the way a picture is drawn: row by row, left to right.
      // Rows are rings of latitude, so the front is a line crossing the body
      // and stepping down — the one body whose order is legible as a
      // sequence rather than as a direction.
      const row = idx % rows;
      const v = row / (rows - 1);
      const col = (Math.floor(idx / rows) % perRow) / perRow;
      const rr = o.orbR ?? 0.88;
      const lat = Math.PI * v;
      const ring = Math.sin(lat) * rr;
      at3[0] = Math.cos(col * TAU + spin) * ring;
      at3[1] = Math.cos(lat) * rr;
      at3[2] = Math.sin(col * TAU + spin) * ring;
      return (row + col) / rows;
    }

    if (body === BODY_SHELLS) {
      // An onion realised from the core outward. Every shell is a complete
      // orb, so what the front does is thicken the body rather than travel
      // over it — the only one of these that grows in the third dimension.
      const k = idx % shells;
      const i2 = Math.floor(idx / shells) % perShell;
      const rr = (o.orbR ?? 0.9) * (0.26 + (0.74 * k) / (shells - 1));
      const [x, y, z] = fibDir(i2, perShell);
      at3[0] = x * rr;
      at3[1] = y * rr;
      at3[2] = z * rr;
      turn();
      return (k + i2 / perShell) / shells;
    }

    if (body === BODY_YARN) {
      // One continuous strand lapping the orb — but four of them, running in
      // parallel a quarter turn apart, so the surface closes without the
      // front having to race. See the note on `strands`.
      const st = idx % strands;
      const s = Math.min(1, Math.floor(idx / strands) / (perStrand - 1));
      const a = s * TAU * (o.winds ?? 9) + (st / strands) * TAU + spin;
      const bb = Math.asin(0.96 * Math.sin(s * TAU * 2.6 + 0.6 + st * 0.7));
      const rr = (o.ballR ?? 0.88) * (1 + (hashD(idx, 4.9) - 0.5) * (o.ballFuzz ?? 0.05));
      at3[0] = Math.cos(a) * Math.cos(bb) * rr;
      at3[1] = Math.sin(bb) * rr;
      at3[2] = Math.sin(a) * Math.cos(bb) * rr;
      return s;
    }

    if (body === BODY_TORUS) {
      const mj = idx % majorN;
      const around = (Math.floor(idx / majorN) % perMajor) / perMajor;
      const maj = (mj / majorN) * TAU + spin;
      const min = around * TAU;
      const ring = (o.majorR ?? 0.72) + (o.minorR ?? 0.29) * Math.cos(min);
      at3[0] = Math.cos(maj) * ring;
      at3[1] = (o.minorR ?? 0.29) * Math.sin(min);
      at3[2] = Math.sin(maj) * ring;
      // Wound rather than filled: one turn of the tube per step around.
      return (mj + around) / majorN;
    }

    // CRYSTAL. L1 normalisation puts the point on an octahedron; L∞ would
    // put it on a cube, which is the shape `solving` already owns.
    const [x, y, z] = fibDir(idx, objN);
    const l1 = Math.max(1e-6, Math.abs(x) + Math.abs(y) + Math.abs(z));
    at3[0] = (x / l1) * crystalR;
    at3[1] = (y / l1) * crystalR;
    at3[2] = (z / l1) * crystalR;
    turn();
    // The Fibonacci index itself already walks the lattice pole to pole in a
    // spiral — an ordering the lattice carries for free.
    return idx / objN;
  }

  // --- pass 1: the body, and where its work front is --------------------
  //
  // The front is not declared by the body, it is observed: whichever
  // realised dot is closest to `prog` is where the work is. A body that had
  // to describe its own front would be twice the code and could disagree
  // with itself. The buckets only matter to the swarm, which aims at
  // several fronts at once when a body has several.
  const frontN = share > 0 ? streams : 1;
  const fronts = [];
  const fdist = [];
  for (let s = 0; s < frontN; s++) {
    fronts.push(0, 0, 0);
    fdist.push(1e9);
  }

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    if (seat >= objN) continue;

    const order = seatOn(seat);
    const bx = at3[0];
    const by = at3[1];
    const bz = at3[2];

    const d = Math.abs(order - prog);
    const lane = seat % frontN;
    if (d < fdist[lane]) {
      fdist[lane] = d;
      fronts[lane * 3] = bx;
      fronts[lane * 3 + 1] = by;
      fronts[lane * 3 + 2] = bz;
    }

    const done = clamp01((prog - order) / feather);
    const hot = working ? Math.exp(-(((order - prog) / headW) ** 2)) : 0;
    const unlit = (1 - done) * c;

    let ox = bx;
    let oy = by;
    let oz = bz;
    if (body === BODY_DIFFUSION) {
      // Noise, drifting on its own slow clock, pulled out of the dot as the
      // front reaches it. The drift matters: a static offset is a dot in the
      // wrong place, and only a moving one reads as noise.
      const amp = (o.noise ?? 0.34) * (1 - done);
      const ph = hashD(seat, 1.3) * TAU;
      const sp = 0.7 + hashD(seat, 5.9) * 0.9;
      ox += Math.sin(t * sp + ph) * amp * (hashD(seat, 2.7) - 0.5) * 2;
      oy += Math.sin(t * sp * 1.13 + ph * 1.7) * amp * (hashD(seat, 6.1) - 0.5) * 2;
      oz += Math.sin(t * sp * 0.87 + ph * 2.3) * amp * (hashD(seat, 9.5) - 0.5) * 2;
    }

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const [px, py, z] = pt(lx + (ox - lx) * c, ly + (oy - ly) * c, lz + (oz - lz) * c);
    const zx = clamp01((z + 1) / 2);
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.headR ?? 1.0) * hot * c) * rs,
      white:
        inkOf(o, zx, e[i] * m + (1 - m)) +
        (o.unlitInk ?? 0.32) * unlit -
        (o.headInk ?? 0.4) * hot * c,
      // Neutral grey until the work reaches it, the brand's colour after.
      // This is the whole of what "realised" means here, and it is what
      // lets the body be present from the first frame without giving away
      // that it is already finished.
      k: 1 - unlit
    });
  }

  // --- pass 2: the matter, when it is switched on -----------------------
  if (share > 0) {
    const shell = o.shellR ?? 1.12;
    const flight = Math.max(0.2, o.flight ?? 1.2);
    const swirl = o.swirlAmp ?? 0.4;
    const spread = o.spread ?? 0.09;

    for (let i = 0; i < n; i++) {
      const seat = seats[i];
      if (seat < objN) continue;

      const pj = seat - objN;
      const lane = pj % frontN;
      const period = flight * (0.72 + hashD(pj, 4.1) * 0.75);
      const u = frac(t / period + hashD(pj, 7.3));
      const ease = u * u * (3 - 2 * u);

      // Its own launch point, and a drift on top, so no two flights lie
      // along the same line — a shared path draws a tail behind the dot.
      const [ax, ay, az] = fibDir(pj, parts);
      const drift = t * 0.11 + hashD(pj, 2.2) * TAU;
      const cd = Math.cos(drift);
      const sd = Math.sin(drift);
      const sx = (ax * cd + az * sd) * shell;
      const sy = ay * shell * 0.72;
      const sz = (-ax * sd + az * cd) * shell;

      // Straight in would be a rain of pins. The bow peaks halfway and
      // vanishes at both ends, so the path curves into the front.
      const arc = Math.sin(Math.PI * ease) * swirl;
      const fade = 1 - ease;
      const jx = (hashD(pj, 5.3) - 0.5) * spread * fade;
      const jy = (hashD(pj, 8.7) - 0.5) * spread * fade;
      const bx = sx + (fronts[lane * 3] - sx) * ease + (ay * cd - az * sd) * arc + jx;
      const by = sy + (fronts[lane * 3 + 1] - sy) * ease + (az * cd - ax * sd) * arc * 0.7 + jy;
      const bz = sz + (fronts[lane * 3 + 2] - sz) * ease + (ax * sd - ay * cd) * arc;

      const lx = p[i * 3];
      const ly = p[i * 3 + 1];
      const lz = p[i * 3 + 2];
      const [px, py, z] = pt(lx + (bx - lx) * c, ly + (by - ly) * c, lz + (bz - lz) * c);
      const zx = clamp01((z + 1) / 2);
      // Fades up out of nothing and is consumed at the front, and is present
      // at the mark whatever it was doing: a carrier still in flight when
      // the logo lands is a dot missing from the logo.
      const live = clamp01(u / 0.14) * clamp01((1 - u) / 0.1);
      const k = ease * ease;
      dots.push({
        x: px,
        y: py,
        z,
        r: ((o.partR ?? 0.5) + (o.partRDepth ?? 1.1) * zx) * rs,
        white: inkOf(o, zx, e[i] * m + (1 - m)) + (o.cargoInk ?? 0.16) * fade * c,
        a: working ? live + (1 - live) * m : 1,
        k: k + (1 - k) * m
      });
    }
  }

  // No body draws edges any more — the wire forms that did are gone, and a
  // volume has no edges worth stroking. The empty list stays because the
  // frame contract has one and a future body may fill it.
  return finalizeFrame(dots, [], o.rMin);
};

/**
 * `generating`, dispatched to one of the bodies.
 *
 * A tune rather than ten states: a caller writes `state="generating"` and
 * picks `body` the way it would pick a colour. Ten states would put ten
 * entries in every switch that handles a state, for a distinction that
 * belongs one level down.
 */
export const frameLogoGenerate: ModeFrame = frameBuild;
