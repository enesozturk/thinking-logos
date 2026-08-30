// Generating: an object, and the particles making it.
//
// Two attempts to get here, wrong in opposite directions. Five build ORDERS
// over one octahedron changed nothing you could see — the object never
// varied, so they read as one animation at five speeds. Five objects that
// grew out of nothing fixed that and broke something worse: for most of the
// cycle there was no object on screen at all, only the fraction of it built
// so far, which is a progress bar drawn in perspective.
//
// What generation actually looks like is three things at once:
//
//   the object    a real 3D form, present and legible for the WHOLE cycle,
//                 turning in space. It is never partly there. What changes
//                 is how much of it has been realised, carried by ink and
//                 colour — dim neutral grey where the work has not reached,
//                 full brand colour where it has.
//   the particles loose matter, streaming in from outside and landing
//                 exactly where the work is happening. They are the reason
//                 the object is being realised, and the only thing on
//                 screen that moves fast.
//   the front     where those two meet: the brightest point in the frame.
//
// Drop any one of the three and it stops reading. Without the object there
// is nothing being made; without the particles nothing is making it;
// without the front they are two unrelated animations sharing a canvas.
//
// The bodies differ in the object and in where its work front travels; the
// particle layer is shared, because a stream of matter falling into a point
// is the same event whatever is being built. Selected by `body`, a number
// rather than a union so the option bag stays capturable whole by a
// Reanimated worklet.

import type { Dot, Line, ModeFrame, OrbFrame } from './types';
import { fibDir, finalizeFrame, frac, hashD, makeProj, radiusScale } from './core';
import { beatAt, inkOf } from './logo';

const TAU = Math.PI * 2;

/** `body` values for {@link frameLogoGenerate}. */
export const BODY_CRYSTAL = 0;
export const BODY_VESSEL = 1;
export const BODY_FROND = 2;
export const BODY_HELIX = 3;
export const BODY_TORUS = 4;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

/**
 * A point on an octahedron, from a Fibonacci index.
 *
 * L1 normalisation is what makes it an octahedron; L∞ would make it a cube,
 * which is the shape `solving` already owns.
 */
function octaSeat(i: number, n: number, half: number, out: number[]): void {
  const [x, y, z] = fibDir(i, n);
  const l1 = Math.max(1e-6, Math.abs(x) + Math.abs(y) + Math.abs(z));
  out[0] = (x / l1) * half;
  out[1] = (y / l1) * half;
  out[2] = (z / l1) * half;
}

/** The vessel's silhouette: a foot, a shoulder, a closing neck. */
function vesselProfile(u: number): number {
  return 0.36 + 0.52 * Math.sin(Math.PI * u ** 0.78) - 0.1 * Math.sin(TAU * u);
}

/**
 * `generating`, as one object being fed by one stream of matter.
 *
 * Five bodies share this function rather than having one each, because
 * almost all of it is shared: the clock, the swarm, the ink language, the
 * morph. What a body contributes is two answers — where does this dot sit
 * on me, and where is my work front right now — which is twenty lines each,
 * not a file each.
 */
const frameBuild: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const body = o.body ?? BODY_CRYSTAL;

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

  // Each body gets the camera that shows it: a vessel needs a tilt or its
  // layers collapse into an outline, a helix needs almost none or its
  // strands cross into a braid, a torus seen face on is a flat ring.
  let lean = 0;
  let tilt = 0.32;
  let yawAmp = 0.26;
  let yawRate = 0.24;
  if (body === BODY_CRYSTAL) {
    // Turned enough to show two faces at once: seen straight on an
    // octahedron is a square, which is the one reading to avoid next to a
    // cube.
    lean = 0.5;
    tilt = 0.2;
    yawAmp = 0.24;
    yawRate = 0.32;
  } else if (body === BODY_HELIX) {
    tilt = 0.1;
    yawAmp = 0.5;
    yawRate = 0.3;
  } else if (body === BODY_TORUS) {
    tilt = 0.52;
    yawAmp = 0.2;
  } else if (body === BODY_FROND) {
    lean = 0.3;
    tilt = 0.26;
    yawAmp = 0.3;
    yawRate = 0.2;
  }
  const pt = makeProj(
    (o.lean ?? lean) + (o.yawAmp ?? yawAmp) * Math.sin(t * (o.yawRate ?? yawRate)) * c,
    (o.tilt ?? tilt) * c,
    cx,
    cx,
    R
  );

  // A slice of the dots are not part of the object at all: they are the
  // matter being delivered to it. Seats are a permutation, so taking them
  // off the end takes an even scatter of the mark rather than one region of
  // it — which matters at the morph, where every dot has to land.
  const share = clamp01(o.swarm ?? 0.22);
  const objN = Math.max(1, Math.round(n * (1 - share)));

  const crystalR = o.crystalR ?? 0.92;
  const layers = Math.max(4, Math.round(o.layers ?? 11));
  const perLayer = Math.max(1, Math.ceil(objN / layers));
  const vesselH = o.vesselH ?? 1.6;
  const vesselR = o.vesselR ?? 0.76;
  const twist = o.layerTwist ?? 0.55;

  const majorN = Math.max(6, Math.round(o.majorN ?? 22));
  const perMajor = Math.max(1, Math.ceil(objN / majorN));
  const majorR = o.majorR ?? 0.72;
  const minorR = o.minorR ?? 0.29;

  const steps = Math.max(2, Math.ceil(objN / 2));
  const helixTurns = o.helixTurns ?? 2.4;
  const helixR = o.helixR ?? 0.44;
  const helixH = o.helixH ?? 1.7;

  const branches = Math.max(3, Math.round(o.branches ?? 8));
  const lanes = Math.max(1, Math.round(o.lanes ?? 3));
  const groups = branches * lanes;
  const perBranch = Math.max(2, Math.ceil(objN / groups));
  const reach = o.reach ?? 0.8;
  const bend = o.bend ?? 0.5;
  const frond = o.frond ?? 0.36;
  const stagger = clamp01(o.growStagger ?? 0.26);

  // The crystal turns faster than the rest: it is the one body with flat
  // faces, and a flat face barely reads as turning until it does.
  const spin = t * (o.spin ?? (body === BODY_CRYSTAL ? 0.3 : 0.14));
  const feather = Math.max(1e-4, o.feather ?? 0.035);
  const headW = Math.max(1e-4, o.headWidth ?? 0.02);

  // Scratch, written by the two functions below. They run once per dot per
  // frame, and a returned tuple here is the hottest allocation in the
  // library — the frame functions are meant to be callable from a worklet
  // sixty times a second without making garbage.
  const at3 = [0, 0, 0];
  const head3 = [0, 0, 0];

  /** The unit frame of branch `br`: direction, and two perpendiculars. */
  const frame6 = [0, 0, 0, 0, 0, 0];
  function branchFrame(br: number): [number, number, number] {
    const [dx, dy, dz] = fibDir(br, branches);
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
    return [dx, dy, dz];
  }

  /** How far branch `br` has grown, in its own length, at `prog`. */
  function branchAt(br: number): number {
    const start = hashD(br, 3.3) * stagger;
    return clamp01(((prog - start) / (1 - start)) ** (1 / 0.85));
  }

  /** Where a dot sits on the object → `at3`; returns when it is realised. */
  function seatOn(idx: number): number {
    if (body === BODY_CRYSTAL) {
      octaSeat(idx, objN, crystalR, at3);
      const ca = Math.cos(spin);
      const sa = Math.sin(spin);
      const x = at3[0];
      at3[0] = x * ca + at3[2] * sa;
      at3[2] = -x * sa + at3[2] * ca;
      // The Fibonacci index itself, which already walks the lattice pole to
      // pole in a spiral — an ordering the lattice carries for free.
      return idx / objN;
    }
    if (body === BODY_VESSEL) {
      const layer = idx % layers;
      const u = layers > 1 ? layer / (layers - 1) : 0;
      const around = (Math.floor(idx / layers) % perLayer) / perLayer;
      const ang = around * TAU + u * twist * TAU + spin;
      const rad = vesselProfile(u) * vesselR;
      at3[0] = Math.cos(ang) * rad;
      at3[1] = (u - 0.5) * vesselH;
      at3[2] = Math.sin(ang) * rad;
      // Layer-major: all of one layer before any of the next, so the front
      // circles the object once per layer as it climbs. That circling is
      // what makes it a nozzle rather than a wipe.
      return (layer + around) / layers;
    }
    if (body === BODY_TORUS) {
      const mj = idx % majorN;
      const around = (Math.floor(idx / majorN) % perMajor) / perMajor;
      const maj = (mj / majorN) * TAU + spin;
      const min = around * TAU;
      const ring = majorR + minorR * Math.cos(min);
      at3[0] = Math.cos(maj) * ring;
      at3[1] = minorR * Math.sin(min);
      at3[2] = Math.sin(maj) * ring;
      // Wound rather than filled: one turn of the tube per step around.
      return (mj + around) / majorN;
    }
    if (body === BODY_HELIX) {
      const strand = idx % 2;
      const k = Math.floor(idx / 2);
      const u = steps > 1 ? Math.min(1, k / (steps - 1)) : 0;
      const ang = u * helixTurns * TAU + strand * Math.PI + spin;
      at3[0] = Math.cos(ang) * helixR;
      at3[1] = (u - 0.5) * helixH;
      at3[2] = Math.sin(ang) * helixR;
      return u;
    }
    // FROND — the one body with no axis of symmetry to fall back on.
    // Everything else here is turned about one, and a set of four solids of
    // revolution is one solid with four profiles.
    const br = idx % branches;
    const lane = Math.floor(idx / branches) % lanes;
    const s = Math.min(1, Math.floor(idx / groups) / (perBranch - 1));
    const [dx, dy, dz] = branchFrame(br);
    const [ux, uy, uz, vx, vy, vz] = frame6;
    // Curvature as the square of length travelled: a branch leaves the seed
    // straight and only turns once it has length. Curving from the first
    // dot reads as an arc someone drew, not as something that grew.
    const curve = bend * s * s;
    const across = lanes > 1 ? lane / (lanes - 1) - 0.5 : 0;
    const wob = (hashD(br * lanes + lane, 6.1) - 0.5) * 0.4;
    const side = (across + wob) * frond * s ** 1.25;
    const lift = (hashD(br * lanes + lane, 2.9) - 0.5) * frond * 0.5 * s ** 1.25;
    at3[0] = dx * s * reach + ux * (curve + side) + vx * lift;
    at3[1] = dy * s * reach + uy * (curve + side) + vy * lift;
    at3[2] = dz * s * reach + uz * (curve + side) + vz * lift;
    const start = hashD(br, 3.3) * stagger;
    return start + s ** 0.85 * (1 - start);
  }

  /**
   * Where the work is happening right now → `head3`, the point matter falls
   * into.
   *
   * `lane` lets a body have several fronts at once: the frond has one per
   * branch, and a stream aimed at the average of eight growing tips would
   * be aimed at nothing.
   */
  function frontAt(lane: number): void {
    if (body === BODY_CRYSTAL) {
      octaSeat(prog * objN, objN, crystalR, head3);
      const ca = Math.cos(spin);
      const sa = Math.sin(spin);
      const x = head3[0];
      head3[0] = x * ca + head3[2] * sa;
      head3[2] = -x * sa + head3[2] * ca;
      return;
    }
    if (body === BODY_VESSEL) {
      const at = prog * layers;
      const layer = Math.min(layers - 1, Math.floor(at));
      const u = layers > 1 ? layer / (layers - 1) : 0;
      const ang = frac(at) * TAU + u * twist * TAU + spin;
      const rad = vesselProfile(u) * vesselR;
      head3[0] = Math.cos(ang) * rad;
      head3[1] = (u - 0.5) * vesselH;
      head3[2] = Math.sin(ang) * rad;
      return;
    }
    if (body === BODY_TORUS) {
      const at = prog * majorN;
      const maj = (Math.min(majorN, at) / majorN) * TAU + spin;
      const min = frac(at) * TAU;
      const ring = majorR + minorR * Math.cos(min);
      head3[0] = Math.cos(maj) * ring;
      head3[1] = minorR * Math.sin(min);
      head3[2] = Math.sin(maj) * ring;
      return;
    }
    if (body === BODY_HELIX) {
      // Alternating strands, so both rails are visibly being fed.
      const strand = lane % 2;
      const ang = prog * helixTurns * TAU + strand * Math.PI + spin;
      head3[0] = Math.cos(ang) * helixR;
      head3[1] = (prog - 0.5) * helixH;
      head3[2] = Math.sin(ang) * helixR;
      return;
    }
    const br = lane % branches;
    const s = branchAt(br);
    const [dx, dy, dz] = branchFrame(br);
    const curve = bend * s * s;
    head3[0] = dx * s * reach + frame6[0] * curve;
    head3[1] = dy * s * reach + frame6[1] * curve;
    head3[2] = dz * s * reach + frame6[2] * curve;
  }

  const shell = o.shellR ?? 1.12;
  const flight = Math.max(0.2, o.flight ?? 1.2);
  const swirl = o.swirlAmp ?? 0.4;
  const parts = Math.max(1, n - objN);
  // Carriers travel in a few STREAMS rather than each on its own path.
  // Independent flights are the obvious way to do it and produce dust: a
  // hundred specks at a hundred phases, each too short-lived to follow, and
  // in a still frame indistinguishable from noise. Phased evenly along a
  // handful of shared paths they become lines of dots pouring into the
  // front — legible in a still, and unmistakable in motion.
  //
  // The frond gets one stream per branch, because its work happens at eight
  // tips at once and a stream aimed at their average is aimed at nothing.
  const streams = body === BODY_FROND ? branches : Math.max(2, Math.round(o.streams ?? 6));
  const perStream = Math.max(1, Math.ceil(parts / streams));

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];

    if (seat < objN) {
      // --- the object -------------------------------------------------
      // Always here, always whole. Only its ink and its colour move.
      const order = seatOn(seat);
      const done = clamp01((prog - order) / feather);
      const hot = working ? Math.exp(-(((order - prog) / headW) ** 2)) : 0;
      const unlit = (1 - done) * c;

      const [px, py, z] = pt(
        lx + (at3[0] - lx) * c,
        ly + (at3[1] - ly) * c,
        lz + (at3[2] - lz) * c
      );
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
      continue;
    }

    // --- the matter ---------------------------------------------------
    // A carrier repeats its own flight on its own period: out of the dark,
    // curving inward, into the front, gone. Periods are hashed rather than
    // shared, so the delivery is a stream and not a volley.
    const pj = seat - objN;
    const lane = pj % streams;
    // Evenly spaced along the lane, so the gap between carriers is constant
    // and the stream reads as one moving thing rather than as a queue.
    const along = Math.floor(pj / streams) / perStream;
    const period = flight * (0.85 + hashD(lane, 4.1) * 0.5);
    const u = frac(t / period + along + hashD(lane, 7.3));
    const ease = u * u * (3 - 2 * u);

    frontAt(lane);
    // The launch point drifts, so consecutive flights of one carrier do not
    // retrace a line — which reads as a wire, not as weather.
    const [ax, ay, az] = fibDir(lane, streams);
    const drift = t * 0.11 + hashD(lane, 2.2) * TAU;
    const cd = Math.cos(drift);
    const sd = Math.sin(drift);
    const sx = (ax * cd + az * sd) * shell;
    const sy = ay * shell * 0.72;
    const sz = (-ax * sd + az * cd) * shell;

    // Straight in would be a rain of pins. The bow is a sideways push that
    // peaks halfway and vanishes at both ends, so the path curves into the
    // front and arrives pointing at it.
    const arc = Math.sin(Math.PI * ease) * swirl;
    // A little per-carrier spread, so a stream is a stream and not a wire.
    const jx = (hashD(pj, 5.3) - 0.5) * (o.spread ?? 0.09);
    const jy = (hashD(pj, 8.7) - 0.5) * (o.spread ?? 0.09);
    const fade = 1 - ease;
    const bx = sx + (head3[0] - sx) * ease + (ay * cd - az * sd) * arc + jx * fade;
    const by = sy + (head3[1] - sy) * ease + (az * cd - ax * sd) * arc * 0.7 + jy * fade;
    const bz = sz + (head3[2] - sz) * ease + (ax * sd - ay * cd) * arc;

    const [px, py, z] = pt(lx + (bx - lx) * c, ly + (by - ly) * c, lz + (bz - lz) * c);
    const zx = clamp01((z + 1) / 2);
    // Fades up out of nothing and is consumed at the front — never simply
    // switched off, which is the one thing that reads as a bug rather than
    // as an event.
    const born = clamp01(u / 0.14);
    const spent = clamp01((1 - u) / 0.1);
    // Present at the mark whatever it was doing: a carrier still in flight
    // when the logo lands would be a dot missing from the logo.
    const alpha = working ? born * spent + (1 - born * spent) * m : 1;
    // Grey cargo, taking the brand's colour as it lands — the same thing
    // `working` says about a dot in transit.
    const k = ease * ease;
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.partR ?? 0.5) + (o.partRDepth ?? 1.1) * zx) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) + (o.cargoInk ?? 0.16) * (1 - ease) * c,
      a: alpha,
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
      const u = steps > 1 ? k2 / (steps - 1) : 0;
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
 * `generating`, dispatched to one of five bodies.
 *
 * A dispatcher rather than five states, because these are five answers to
 * the same question and a product picks one: a caller writes
 * `state="generating"` and tunes `body`, the way it would pick a colour.
 * Five states would put five entries in every switch that handles a state,
 * for a distinction that belongs one level down.
 */
export const frameLogoGenerate: ModeFrame = frameBuild;
