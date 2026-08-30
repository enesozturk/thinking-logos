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
// WHAT COUNTS AS A BODY. Every one of these is the orb or something the orb
// could become: a shell, a lattice, a winding, a ring, a band. Things were
// tried that were not — a turned vessel, a stepped tower, a cog, a tree, a
// coiled shell — and they are gone, however well they animated. A logo
// spinner is a mark and an abstraction of loading; the moment the form is a
// recognisable OBJECT, the viewer reads a picture of that object, wonders
// what a pot has to do with the product, and the mark is the second thing
// they looked at. Add bodies freely; add objects never.

import type { Dot, Line, ModeFrame, OrbFrame } from './types';
import { fibDir, finalizeFrame, frac, hashD, makeProj, radiusScale } from './core';
import { beatAt, inkOf } from './logo';

const TAU = Math.PI * 2;

/**
 * `body` values for {@link frameLogoGenerate} — the form being realised.
 * Numbers rather than a union, so the whole option bag stays capturable by
 * a Reanimated worklet.
 */
export const BODY_CRYSTAL = 0;
export const BODY_TORUS = 1;
export const BODY_LATTICE = 2;
export const BODY_YARN = 3;
export const BODY_LANTERN = 4;
export const BODY_MOBIUS = 5;
export const BODY_HELIX = 6;
export const BODY_ARMILLARY = 7;
export const BODY_KNOT = 8;
export const BODY_GALAXY = 9;
/** How many bodies exist. */
export const BODY_COUNT = 10;

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
  0.5, 0.2, 0.24, 0.32, // crystal — two faces at once, never square on
  0.0, 0.52, 0.2, 0.24, // torus — face on it is a ring, not a solid
  0.4, 0.3, 0.3, 0.28, // lattice
  0.2, 0.28, 0.3, 0.26, // yarn
  0.0, 0.3, 0.28, 0.22, // lantern
  0.2, 0.4, 0.35, 0.26, // mobius — the half twist has to be seen from above
  0.0, 0.1, 0.5, 0.3, // helix — almost no tilt, wide yaw
  0.3, 0.3, 0.3, 0.24, // armillary
  0.2, 0.35, 0.3, 0.26, // knot
  0.0, 0.6, 0.18, 0.2 // galaxy — a disc wants to be looked down on
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
  const pt = makeProj(
    (o.lean ?? CAMERAS[cam]) +
      (o.yawAmp ?? CAMERAS[cam + 2]) * Math.sin(t * (o.yawRate ?? CAMERAS[cam + 3])) * c,
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

  const steps = Math.max(2, Math.ceil(objN / 2));
  const helixTurns = o.helixTurns ?? 2.4;
  const helixR = o.helixR ?? 0.44;
  const helixH = o.helixH ?? 1.7;

  const rings = Math.max(3, Math.round(o.rings ?? 4));
  const perRing = Math.max(1, Math.ceil(objN / rings));

  const bandW = Math.max(3, Math.round(o.bandW ?? 5));
  const perBand = Math.max(2, Math.ceil(objN / bandW));

  const petals = Math.max(5, Math.round(o.petals ?? 15));
  const perPetal = Math.max(2, Math.ceil(objN / petals));

  const arms = Math.max(2, Math.round(o.arms ?? 3));

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
    if (body === BODY_CRYSTAL) {
      // L1 normalisation puts the point on an octahedron; L∞ would put it
      // on a cube, which is the shape `solving` already owns.
      const [x, y, z] = fibDir(idx, objN);
      const l1 = Math.max(1e-6, Math.abs(x) + Math.abs(y) + Math.abs(z));
      at3[0] = (x / l1) * crystalR;
      at3[1] = (y / l1) * crystalR;
      at3[2] = (z / l1) * crystalR;
      turn();
      // The Fibonacci index itself already walks the lattice pole to pole
      // in a spiral — an ordering the lattice carries for free.
      return idx / objN;
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

    if (body === BODY_LATTICE) {
      // The orb quantised onto a grid: the same dots the sphere would have,
      // snapped to cells, so it reads as voxels rather than as a surface.
      const q = o.cell ?? 0.17;
      const [x, y, z] = fibDir(idx, objN);
      const rr = 0.9;
      at3[0] = Math.round((x * rr) / q) * q;
      at3[1] = Math.round((y * rr) / q) * q;
      at3[2] = Math.round((z * rr) / q) * q;
      turn();
      // A flat wavefront on the diagonal, so cells light in sheets.
      return clamp01((at3[0] + at3[1] + at3[2] + 3 * rr) / (6 * rr));
    }

    if (body === BODY_YARN) {
      // One continuous strand wound over the orb, the winding axis drifting
      // so passes cross instead of stacking into a groove.
      //
      // The winding count is what decides whether this is a ball or a few
      // hoops. Thirteen left the orb showing through in bands; the strand
      // has to lap often enough that the gaps close and what is left is a
      // sphere made of one line.
      const s = idx / objN;
      const a = s * TAU * (o.winds ?? 34) + spin;
      const bb = Math.asin(0.96 * Math.sin(s * TAU * 2.6 + 0.6));
      const rr = (o.ballR ?? 0.88) * (1 + (hashD(idx, 4.9) - 0.5) * (o.ballFuzz ?? 0.05));
      at3[0] = Math.cos(a) * Math.cos(bb) * rr;
      at3[1] = Math.sin(bb) * rr;
      at3[2] = Math.sin(a) * Math.cos(bb) * rr;
      return s;
    }

    if (body === BODY_LANTERN) {
      // Meridians closed one at a time. The rib count is the whole
      // difference between a sphere and a birdcage: too few and it is
      // mostly the gaps you see.
      const rib = idx % petals;
      const v = Math.min(1, Math.floor(idx / petals) / (perPetal - 1));
      const ang = (rib / petals) * TAU + spin + 0.35 * Math.sin(v * Math.PI);
      const rr = Math.sin(v * Math.PI) * (o.lanternR ?? 0.84);
      at3[0] = Math.cos(ang) * rr;
      at3[1] = Math.cos(v * Math.PI) * (o.lanternH ?? 0.88);
      at3[2] = Math.sin(ang) * rr;
      return (rib + v) / petals;
    }

    if (body === BODY_MOBIUS) {
      const w = idx % bandW;
      const u = Math.min(1, Math.floor(idx / bandW) / (perBand - 1));
      const th = u * TAU + spin;
      const wv = (w / (bandW - 1) - 0.5) * (o.bandWide ?? 0.44);
      const rr = (o.bandR ?? 0.7) + wv * Math.cos(th / 2);
      at3[0] = Math.cos(th) * rr;
      at3[1] = wv * Math.sin(th / 2);
      at3[2] = Math.sin(th) * rr;
      return u;
    }

    if (body === BODY_HELIX) {
      const strand = idx % 2;
      const u = Math.min(1, Math.floor(idx / 2) / (steps - 1));
      const ang = u * helixTurns * TAU + strand * Math.PI + spin;
      at3[0] = Math.cos(ang) * helixR;
      at3[1] = (u - 0.5) * helixH;
      at3[2] = Math.sin(ang) * helixR;
      return u;
    }

    if (body === BODY_ARMILLARY) {
      // Nested hoops on different axes — the orb reduced to its own great
      // circles, threaded one at a time.
      const k = idx % rings;
      const around = (Math.floor(idx / rings) % perRing) / perRing;
      const rad = 0.92 - k * (0.62 / rings);
      const a = around * TAU + spin;
      const x0 = Math.cos(a) * rad;
      const z0 = Math.sin(a) * rad;
      const al = k * 0.62;
      const be = k * 1.1;
      const y1 = -z0 * Math.sin(al);
      const z1 = z0 * Math.cos(al);
      at3[0] = x0 * Math.cos(be) + z1 * Math.sin(be);
      at3[1] = y1;
      at3[2] = -x0 * Math.sin(be) + z1 * Math.cos(be);
      return (k + around) / rings;
    }

    if (body === BODY_KNOT) {
      const s = idx / objN;
      const th = s * TAU;
      const r1 = o.knotR ?? 0.58;
      const r2 = o.knotTube ?? 0.24;
      const ring = r1 + r2 * Math.cos(3 * th);
      at3[0] = Math.cos(2 * th + spin) * ring;
      at3[1] = r2 * Math.sin(3 * th);
      at3[2] = Math.sin(2 * th + spin) * ring;
      // A cord has thickness, but only just: at 0.09 the crossings blurred
      // into each other and the trefoil stopped being three lobes.
      at3[0] += (hashD(idx, 3.1) - 0.5) * 0.045;
      at3[1] += (hashD(idx, 5.7) - 0.5) * 0.045;
      at3[2] += (hashD(idx, 8.3) - 0.5) * 0.045;
      return s;
    }

    // GALAXY. The orb flattened into a field that is already turning,
    // realised from the core outward — the one body that is not a surface.
    const arm = idx % arms;
    const q = Math.sqrt((Math.floor(idx / arms) + 0.5) / Math.ceil(objN / arms));
    const ang =
      (arm / arms) * TAU + q * (o.swirlTurns ?? 2.4) * TAU + spin + (hashD(idx, 6.6) - 0.5) * 0.5;
    const rr = q * (o.discR ?? 1.0);
    at3[0] = Math.cos(ang) * rr;
    at3[1] = (hashD(idx, 9.4) - 0.5) * 0.14 * (1 - q);
    at3[2] = Math.sin(ang) * rr;
    return q;
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

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const [px, py, z] = pt(lx + (bx - lx) * c, ly + (by - ly) * c, lz + (bz - lz) * c);
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

  // The helix's body is two things, and rungs are what separate a double
  // strand from a coiled spring. Drawn only where the strand has been
  // realised, so the ladder builds along with its rails.
  const lines: Line[] = [];
  if (body === BODY_HELIX) {
    const every = Math.max(2, Math.round(o.rungEvery ?? 5));
    // A stroke floor in device pixels, not a scale factor: below about half
    // a pixel a line stops being a line and becomes a smudge.
    const lw = Math.max(0.55, (o.rungW ?? 0.9) * rs);
    for (let k2 = 0; k2 < steps; k2 += every) {
      const u = k2 / (steps - 1);
      const done = clamp01((prog - u) / feather);
      const a = done * c * (o.rungA ?? 0.5);
      if (a < 0.02) continue;
      const ang = u * helixTurns * TAU + spin;
      const y = (u - 0.5) * helixH;
      const [x1, y1] = pt(Math.cos(ang) * helixR, y, Math.sin(ang) * helixR);
      const [x2, y2, z2] = pt(-Math.cos(ang) * helixR, y, -Math.sin(ang) * helixR);
      lines.push({ x1, y1, x2, y2, white: inkOf(o, clamp01((z2 + 1) / 2), 1), a, w: lw });
    }
  }

  return finalizeFrame(dots, lines, o.rMin);
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
