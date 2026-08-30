// Generating: an object, the particles making it, and the front.
//
// Three attempts to get here. Five build ORDERS over one octahedron changed
// nothing you could see — the object never varied, so they read as one
// animation at five speeds. Five objects that GREW OUT OF NOTHING fixed
// that and broke something worse: for most of the cycle there was no object
// on screen at all, only the fraction built so far, which is a progress bar
// drawn in perspective.
//
// What generation looks like is three things at once:
//
//   the object    a real 3D form, present and legible for the WHOLE cycle,
//                 turning in space. It is never partly there. What changes
//                 is how much of it has been realised, carried by ink and
//                 colour — dim neutral grey where the work has not reached,
//                 full brand colour where it has.
//   the particles loose matter, streaming in from outside and landing where
//                 the work is happening. The only thing on screen that
//                 moves fast, and the reason the object is being realised.
//   the front     where those two meet: the brightest point in the frame.
//
// Drop any one and it stops reading. Without the object nothing is being
// made; without the particles nothing is making it; without the front they
// are two unrelated animations sharing a canvas.
//
// Everything except the object is shared, which is why there are eighteen
// bodies here and not eighteen files. A body answers exactly one question —
// where does dot `i` sit on me, and when is it realised — in twenty lines.
// The front is then DERIVED rather than declared: it is the realised dot
// closest to the work, found while the object is being laid out. A body
// that had to describe its own front would be twice the code and could
// disagree with itself.

import type { Dot, Line, ModeFrame, OrbFrame } from './types';
import { fibDir, finalizeFrame, frac, hashD, makeProj, radiusScale } from './core';
import { beatAt, inkOf } from './logo';

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * `body` values for {@link frameLogoGenerate} — the object being generated.
 * Numbers rather than a union, so the whole option bag stays capturable by
 * a Reanimated worklet.
 */
export const BODY_CRYSTAL = 0;
export const BODY_VESSEL = 1;
export const BODY_FROND = 2;
export const BODY_HELIX = 3;
export const BODY_TORUS = 4;
export const BODY_NAUTILUS = 5;
export const BODY_ARMILLARY = 6;
export const BODY_MOBIUS = 7;
export const BODY_LATTICE = 8;
export const BODY_KNOT = 9;
export const BODY_TOWER = 10;
export const BODY_HOURGLASS = 11;
export const BODY_YARN = 12;
export const BODY_GEAR = 13;
export const BODY_TREE = 14;
export const BODY_LANTERN = 15;
export const BODY_SCROLL = 16;
export const BODY_GALAXY = 17;
/** How many bodies exist. */
export const BODY_COUNT = 18;

/**
 * Camera per body: lean, tilt, yaw amplitude, yaw rate — four numbers each,
 * flat, in `body` order.
 *
 * Not one shared camera, because the camera is half of whether a form reads
 * at all: a vessel seen face on is an outline, a torus is a flat ring, a
 * helix under any real tilt crosses itself into a braid, and an octahedron
 * square to the viewer is a square. Not per-body option keys either — that
 * would be seventy-two names in a bag every body has to ignore.
 */
const CAMERAS = [
  0.5, 0.2, 0.24, 0.32, // crystal — two faces at once, never square on
  0.0, 0.32, 0.26, 0.24, // vessel — enough tilt that the layers read as a stack
  0.3, 0.26, 0.3, 0.2, // frond
  0.0, 0.1, 0.5, 0.3, // helix — almost no tilt, wide yaw
  0.0, 0.52, 0.2, 0.24, // torus — seen face on it is a ring, not a solid
  0.0, 0.45, 0.25, 0.22, // nautilus — the coil is planar, so look down on it
  0.3, 0.3, 0.3, 0.24, // armillary
  0.2, 0.4, 0.35, 0.26, // mobius — the half twist needs to be seen from above
  0.4, 0.3, 0.3, 0.28, // lattice
  0.2, 0.35, 0.3, 0.26, // knot
  0.0, 0.3, 0.3, 0.2, // tower
  0.0, 0.22, 0.28, 0.24, // hourglass — near level, so both cones read
  0.2, 0.28, 0.3, 0.26, // yarn
  0.0, 0.55, 0.22, 0.22, // gear — a wheel edge on is a bar
  0.0, 0.22, 0.3, 0.2, // tree
  0.0, 0.3, 0.28, 0.22, // lantern
  0.0, 0.35, 0.3, 0.24, // scroll
  0.0, 0.6, 0.18, 0.2 // galaxy — a disc wants to be looked down on
];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

/** The vessel's silhouette: a foot, a shoulder, a closing neck. */
function vesselProfile(u: number): number {
  return 0.36 + 0.52 * Math.sin(Math.PI * u ** 0.78) - 0.1 * Math.sin(TAU * u);
}

/**
 * `generating`: one object, fed by streams of matter.
 *
 * The body switch sits inside the per-dot loop rather than around it. That
 * is deliberate: eighteen frame functions would be eighteen copies of the
 * clock, the swarm, the morph and the ink language, and the last time this
 * file held one function per variant they had already started to disagree.
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
    (o.lean ?? CAMERAS[cam]) + (o.yawAmp ?? CAMERAS[cam + 2]) * Math.sin(t * (o.yawRate ?? CAMERAS[cam + 3])) * c,
    (o.tilt ?? CAMERAS[cam + 1]) * c,
    cx,
    cx,
    R
  );

  // A slice of the dots are not part of the object at all: they are the
  // matter being delivered to it. Seats are a permutation, so taking them
  // off the end takes an even scatter of the mark rather than one region of
  // it — which matters at the morph, where every dot has to land.
  const share = clamp01(o.swarm ?? 0.14);
  const objN = Math.max(8, Math.round(n * (1 - share)));
  const parts = Math.max(1, n - objN);

  // Carriers AIM in a few directions — the frond has one per branch, since
  // its work happens at eight tips at once and a stream aimed at their
  // average is aimed at nothing — but each one flies alone.
  //
  // They were briefly phased evenly along shared paths, which drew a line
  // of dots behind every carrier. It read as a tail, and a tail is a second
  // thing to follow in a frame that already has an object, a front and the
  // matter itself. Each carrier now has its own launch point and its own
  // phase, so what arrives is a scatter of single dots.
  const streams = Math.max(2, Math.min(12, Math.round(o.streams ?? 6)));

  const spin = t * (o.spin ?? (body === BODY_CRYSTAL ? 0.3 : 0.16));
  const feather = Math.max(1e-4, o.feather ?? 0.035);
  const headW = Math.max(1e-4, o.headWidth ?? 0.02);

  // --- body constants, resolved once ------------------------------------
  const crystalR = o.crystalR ?? 0.92;

  const layers = Math.max(4, Math.round(o.layers ?? 11));
  const perLayer = Math.max(1, Math.ceil(objN / layers));

  const majorN = Math.max(6, Math.round(o.majorN ?? 22));
  const perMajor = Math.max(1, Math.ceil(objN / majorN));

  const steps = Math.max(2, Math.ceil(objN / 2));
  const helixTurns = o.helixTurns ?? 2.4;
  const helixR = o.helixR ?? 0.44;
  const helixH = o.helixH ?? 1.7;

  const branches = Math.max(3, Math.round(o.branches ?? 8));
  const lanes = Math.max(1, Math.round(o.lanes ?? 3));
  const groups = branches * lanes;
  const perBranch = Math.max(2, Math.ceil(objN / groups));

  const rings = Math.max(3, Math.round(o.rings ?? 4));
  const perRing = Math.max(1, Math.ceil(objN / rings));

  const bandW = Math.max(3, Math.round(o.bandW ?? 5));
  const perBand = Math.max(2, Math.ceil(objN / bandW));

  const levels = Math.max(4, Math.round(o.levels ?? 9));
  const perLevel = Math.max(1, Math.ceil(objN / levels));

  const waist = Math.max(6, Math.round(o.waistRows ?? 14));
  const perWaist = Math.max(1, Math.ceil(objN / waist));

  const petals = Math.max(5, Math.round(o.petals ?? 9));
  const perPetal = Math.max(2, Math.ceil(objN / petals));

  const sheetRows = Math.max(4, Math.round(o.sheetRows ?? 7));
  const perSheet = Math.max(2, Math.ceil(objN / sheetRows));

  const teeth = Math.max(6, Math.round(o.teeth ?? 10));
  const perGear = Math.max(2, Math.ceil(objN / 3));

  const arms = Math.max(2, Math.round(o.arms ?? 3));

  // Scratch. These run once per dot per frame and a returned tuple here is
  // the hottest allocation in the library.
  const at3 = [0, 0, 0];
  const tmp3 = [0, 0, 0];

  /** The unit frame of branch `br`: direction in `tmp3`, perpendiculars. */
  const frame6 = [0, 0, 0, 0, 0, 0];
  function branchFrame(br: number, count: number): void {
    const [dx, dy, dz] = fibDir(br, count);
    tmp3[0] = dx;
    tmp3[1] = dy;
    tmp3[2] = dz;
    const hx = hashD(br, 1.7) - 0.5;
    const hy = hashD(br, 4.3) - 0.5;
    const hz = hashD(br, 9.1) - 0.5;
    const d = hx * dx + hy * dy + hz * dz;
    let ux = hx - dx * d;
    let uy = hy - dy * d;
    let uz = hz - dz * d;
    const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy + uz * uz));
    ux /= ul;
    uy /= ul;
    uz /= ul;
    frame6[0] = ux;
    frame6[1] = uy;
    frame6[2] = uz;
    frame6[3] = dy * uz - dz * uy;
    frame6[4] = dz * ux - dx * uz;
    frame6[5] = dx * uy - dy * ux;
  }

  /** Turn `at3` about the vertical axis by the object's own spin. */
  function turn(): void {
    const ca = Math.cos(spin);
    const sa = Math.sin(spin);
    const x = at3[0];
    at3[0] = x * ca + at3[2] * sa;
    at3[2] = -x * sa + at3[2] * ca;
  }

  /**
   * Where dot `idx` sits on the object → `at3`; returns when it is realised,
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

    if (body === BODY_VESSEL) {
      const layer = idx % layers;
      const u = layer / (layers - 1);
      const around = (Math.floor(idx / layers) % perLayer) / perLayer;
      const ang = around * TAU + u * (o.layerTwist ?? 0.55) * TAU + spin;
      const rad = vesselProfile(u) * (o.vesselR ?? 0.76);
      at3[0] = Math.cos(ang) * rad;
      at3[1] = (u - 0.5) * (o.vesselH ?? 1.6);
      at3[2] = Math.sin(ang) * rad;
      // Layer-major, so the front circles the object once per layer as it
      // climbs. That circling is what makes it a nozzle, not a wipe.
      return (layer + around) / layers;
    }

    if (body === BODY_FROND) {
      const br = idx % branches;
      const lane = Math.floor(idx / branches) % lanes;
      const s = Math.min(1, Math.floor(idx / groups) / (perBranch - 1));
      branchFrame(br, branches);
      const dx = tmp3[0];
      const dy = tmp3[1];
      const dz = tmp3[2];
      const [ux, uy, uz, vx, vy, vz] = frame6;
      // Curvature as the square of length travelled: a branch leaves the
      // seed straight and only turns once it has length. Curving from the
      // first dot reads as an arc someone drew, not as growth.
      const reach = o.reach ?? 0.8;
      const curve = (o.bend ?? 0.5) * s * s;
      const frond = o.frond ?? 0.36;
      const across = lanes > 1 ? lane / (lanes - 1) - 0.5 : 0;
      const wob = (hashD(br * lanes + lane, 6.1) - 0.5) * 0.4;
      const side = (across + wob) * frond * s ** 1.25;
      const lift = (hashD(br * lanes + lane, 2.9) - 0.5) * frond * 0.5 * s ** 1.25;
      at3[0] = dx * s * reach + ux * (curve + side) + vx * lift;
      at3[1] = dy * s * reach + uy * (curve + side) + vy * lift;
      at3[2] = dz * s * reach + uz * (curve + side) + vz * lift;
      const start = hashD(br, 3.3) * clamp01(o.growStagger ?? 0.26);
      return start + s ** 0.85 * (1 - start);
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

    if (body === BODY_NAUTILUS) {
      // A logarithmic coil: every turn is a fixed multiple of the last, so
      // the chambers grow the way a real shell's do rather than by an even
      // step, which reads as a coil of rope.
      //
      // Stepped along the RADIUS rather than along the angle. Uniform in
      // angle is the obvious parameterisation and packs most of the dots
      // into the tight inner turns, where there is least room for them:
      // the shell came out a bright smudge with a thin thread leaving it.
      const s = idx / objN;
      const grow = o.coilGrow ?? 0.95;
      const rad = 0.14 + s * ((o.coilR ?? 0.82) - 0.14);
      const th = (Math.log(rad / 0.14) / grow) * TAU;
      const tube = 0.34 * rad;
      const ph = frac(idx * 0.6180339887) * TAU;
      const rr = rad + tube * Math.cos(ph);
      at3[0] = Math.cos(th + spin) * rr;
      at3[1] = tube * Math.sin(ph);
      at3[2] = Math.sin(th + spin) * rr;
      return s;
    }

    if (body === BODY_ARMILLARY) {
      // Nested hoops on different axes — an instrument, not a solid. Each
      // one is threaded whole before the next begins.
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

    if (body === BODY_LATTICE) {
      // A ball quantised onto a grid: the same dots the sphere would have,
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

    if (body === BODY_TOWER) {
      // Stepped storeys on a square plan — the one body with corners, and
      // the only silhouette here that is not a curve.
      const level = idx % levels;
      const u = level / (levels - 1);
      const around = (Math.floor(idx / levels) % perLevel) / perLevel;
      const half = (o.towerR ?? 0.62) * (1 - 0.55 * u);
      const side = Math.floor(around * 4) % 4;
      const f = frac(around * 4) * 2 - 1;
      let sx = 0;
      let sz = 0;
      if (side === 0) {
        sx = f;
        sz = -1;
      } else if (side === 1) {
        sx = 1;
        sz = f;
      } else if (side === 2) {
        sx = -f;
        sz = 1;
      } else {
        sx = -1;
        sz = -f;
      }
      const ca = Math.cos(spin);
      const sa = Math.sin(spin);
      at3[0] = (sx * ca + sz * sa) * half;
      at3[1] = (u - 0.5) * (o.towerH ?? 1.5);
      at3[2] = (-sx * sa + sz * ca) * half;
      return (level + around) / levels;
    }

    if (body === BODY_HOURGLASS) {
      const row = idx % waist;
      const u = (row / (waist - 1)) * 2 - 1;
      const around = (Math.floor(idx / waist) % perWaist) / perWaist;
      const rad = 0.72 * Math.abs(u) + 0.05;
      const a = around * TAU + spin;
      at3[0] = Math.cos(a) * rad;
      at3[1] = u * 0.85;
      at3[2] = Math.sin(a) * rad;
      // Both cones fill toward the waist, so the work closes on the middle
      // from two directions at once and arrives there together.
      return 1 - Math.abs(u);
    }

    if (body === BODY_YARN) {
      // One continuous strand wound over a ball, the winding axis drifting
      // so the passes cross instead of stacking into a groove.
      const s = idx / objN;
      const a = s * TAU * (o.winds ?? 13) + spin;
      const bb = Math.asin(0.94 * Math.sin(s * TAU * 1.6 + 0.6));
      const rr = o.ballR ?? 0.88;
      at3[0] = Math.cos(a) * Math.cos(bb) * rr;
      at3[1] = Math.sin(bb) * rr;
      at3[2] = Math.sin(a) * Math.cos(bb) * rr;
      return s;
    }

    if (body === BODY_GEAR) {
      // Two faces and a rim. Teeth are a step function on the radius, so
      // the profile is square — a cog, not a flower.
      const part = idx % 3;
      const k = Math.floor(idx / 3);
      const a = (k / perGear) * TAU + spin;
      const toothed = Math.cos(teeth * a) > 0 ? 1 : 0;
      const rad = (o.gearR ?? 0.58) + (o.toothD ?? 0.19) * toothed;
      const th = o.gearH ?? 0.16;
      // Weighted to the rim. Filling the faces evenly buries the teeth in a
      // disc of dots — what makes a cog a cog is its edge, so the edge is
      // where the dots go.
      const rr = part === 2 ? rad : rad * (0.62 + 0.38 * frac(k * 0.6180339887));
      at3[0] = Math.cos(a) * rr;
      at3[1] = part === 2 ? (hashD(idx, 4.4) - 0.5) * 2 * th : (part === 0 ? th : -th);
      at3[2] = Math.sin(a) * rr;
      return frac(k / perGear);
    }

    if (body === BODY_TREE) {
      // Trunk, boughs, twigs: the same rule applied three times, which is
      // the whole difference between a tree and a bunch of sticks.
      const b1 = idx % 4;
      const b2 = Math.floor(idx / 4) % 3;
      const per = Math.max(2, Math.ceil(objN / 12));
      const s = Math.min(1, Math.floor(idx / 12) / (per - 1));
      const baseY = -0.8;
      if (s < 0.34) {
        const f = s / 0.34;
        at3[0] = (hashD(idx, 2.5) - 0.5) * 0.05;
        at3[1] = baseY + f * 0.62;
        at3[2] = (hashD(idx, 7.1) - 0.5) * 0.05;
        return s;
      }
      branchFrame(b1, 4);
      const d1x = tmp3[0] * 0.9;
      const d1y = Math.abs(tmp3[1]) * 0.6 + 0.5;
      const d1z = tmp3[2] * 0.9;
      const topY = baseY + 0.62;
      if (s < 0.68) {
        const f = (s - 0.34) / 0.34;
        at3[0] = d1x * f * 0.5;
        at3[1] = topY + d1y * f * 0.5;
        at3[2] = d1z * f * 0.5;
        return s;
      }
      const f = (s - 0.68) / 0.32;
      branchFrame(b1 * 3 + b2, 12);
      at3[0] = d1x * 0.5 + tmp3[0] * f * 0.42;
      at3[1] = topY + d1y * 0.5 + (Math.abs(tmp3[1]) * 0.5 + 0.35) * f * 0.42;
      at3[2] = d1z * 0.5 + tmp3[2] * f * 0.42;
      return s;
    }

    if (body === BODY_LANTERN) {
      // Ribs closed one at a time: a paper lamp taking shape, and the only
      // body here that is hollow in a way you can see through.
      const rib = idx % petals;
      const v = Math.min(1, Math.floor(idx / petals) / (perPetal - 1));
      const ang = (rib / petals) * TAU + spin + 0.35 * Math.sin(v * Math.PI);
      const rr = Math.sin(v * Math.PI) * (o.lanternR ?? 0.82);
      at3[0] = Math.cos(ang) * rr;
      at3[1] = Math.cos(v * Math.PI) * (o.lanternH ?? 0.86);
      at3[2] = Math.sin(ang) * rr;
      return (rib + v) / petals;
    }

    if (body === BODY_SCROLL) {
      // A sheet rolling itself up: the radius grows with the angle, so the
      // outer wrap is visibly a later wrap than the inner one.
      const row = idx % sheetRows;
      const col = Math.min(1, Math.floor(idx / sheetRows) / (perSheet - 1));
      const turns = o.scrollTurns ?? 2.4;
      const th = col * turns * TAU;
      // The gap between wraps has to beat the dot spacing or the roll reads
      // as one thick tube instead of as a sheet with an edge.
      const rr = 0.17 + 0.135 * (th / TAU);
      at3[0] = Math.cos(th + spin) * rr;
      at3[1] = (row / (sheetRows - 1) - 0.5) * (o.scrollH ?? 1.4);
      at3[2] = Math.sin(th + spin) * rr;
      return col;
    }

    // GALAXY. Matter already in place and already turning, realised from
    // the core outward — the one body that is a field rather than a solid.
    const arm = idx % arms;
    const q = Math.sqrt((Math.floor(idx / arms) + 0.5) / Math.ceil(objN / arms));
    const ang = (arm / arms) * TAU + q * (o.swirlTurns ?? 2.4) * TAU + spin + (hashD(idx, 6.6) - 0.5) * 0.5;
    const rr = q * (o.discR ?? 1.0);
    at3[0] = Math.cos(ang) * rr;
    at3[1] = (hashD(idx, 9.4) - 0.5) * 0.14 * (1 - q);
    at3[2] = Math.sin(ang) * rr;
    return q;
  }

  // --- pass 1: the object, and where its work front is ------------------
  //
  // The front is not declared by the body, it is observed: whichever
  // realised dot is closest to `prog` is where the work is. Bucketing by
  // `idx % streams` gives one front per stream, which matters for a body
  // whose work happens in several places at once — the frond grows at eight
  // tips, and a stream aimed at their average is aimed at nothing.
  const fronts = [];
  const fdist = [];
  for (let s = 0; s < streams; s++) {
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
    const lane = seat % streams;
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
      // lets the object be present from the first frame without giving
      // away that it is already finished.
      k: 1 - unlit
    });
  }

  // --- pass 2: the matter -----------------------------------------------
  const shell = o.shellR ?? 1.12;
  const flight = Math.max(0.2, o.flight ?? 1.2);
  const swirl = o.swirlAmp ?? 0.4;
  const spread = o.spread ?? 0.09;

  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    if (seat < objN) continue;

    const pj = seat - objN;
    const lane = pj % streams;
    const period = flight * (0.72 + hashD(pj, 4.1) * 0.75);
    const u = frac(t / period + hashD(pj, 7.3));
    const ease = u * u * (3 - 2 * u);

    // Its own launch point, and a drift on top, so no two flights lie along
    // the same line.
    const [ax, ay, az] = fibDir(pj, parts);
    const drift = t * 0.11 + hashD(pj, 2.2) * TAU;
    const cd = Math.cos(drift);
    const sd = Math.sin(drift);
    const sx = (ax * cd + az * sd) * shell;
    const sy = ay * shell * 0.72;
    const sz = (-ax * sd + az * cd) * shell;

    // Straight in would be a rain of pins. The bow is a sideways push that
    // peaks halfway and vanishes at both ends, so the path curves into the
    // front and arrives pointing at it.
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
    // Fades up out of nothing and is consumed at the front — never simply
    // switched off, which is the one thing that reads as a bug rather than
    // as an event. And present at the mark whatever it was doing: a carrier
    // still in flight when the logo lands is a dot missing from the logo.
    const live = clamp01(u / 0.14) * clamp01((1 - u) / 0.1);
    const k = ease * ease;
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.partR ?? 0.5) + (o.partRDepth ?? 1.1) * zx) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) + (o.cargoInk ?? 0.16) * fade * c,
      a: working ? live + (1 - live) * m : 1,
      // Grey cargo, taking the brand's colour as it lands — the same thing
      // `working` says about a dot in transit.
      k: k + (1 - k) * m
    });
  }

  // The helix's object is two things, and rungs are what separate a double
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
 * A tune rather than eighteen states: a caller writes `state="generating"`
 * and picks `body` the way it would pick a colour. Eighteen states would
 * put eighteen entries in every switch that handles a state, for a
 * distinction that belongs one level down.
 */
export const frameLogoGenerate: ModeFrame = frameBuild;
