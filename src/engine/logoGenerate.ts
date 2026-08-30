// Generating: five different things being made.
//
// Every other state here is a mood — thinking, waiting, listening — and a
// mood is one object doing one thing. `generating` is not a mood. It is a
// process, and a process is known by what it leaves behind: a crystal, a
// printed vessel, a grown branch, a transcribed strand, a collapsed disc.
// Five build orders over one octahedron answered "when is this dot made?"
// five ways and the object never changed, which made them read as one
// animation at five speeds rather than as five ideas.
//
// So the variant is the OBJECT, not the ordering. Each body below is its
// own form with its own motion, and what they share is a language rather
// than a shape:
//
//   unmade   neutral grey, dim — or absent entirely, where the object is
//            one that accretes matter rather than working matter it has
//   made     full ink, full brand colour
//   the head the brightest thing on screen, wherever the work is happening
//
// That shared language is what keeps five wildly different forms reading as
// five versions of ONE state rather than as five unrelated states. And the
// rule the whole library is built on still binds every one of them: however
// strange the intermediate object, the viewer must be able to see what the
// logo IS the moment the mark arrives.
//
// Selected by `body`, a number rather than a union so the option bag stays
// capturable whole by a Reanimated worklet.

import type { Dot, Line, ModeFrame, OrbFrame } from './types';
import type { ModeOpts } from './profiles';
import { fibDir, finalizeFrame, hashD, makeProj, radiusScale } from './core';
import { beatAt, inkOf } from './logo';
import { frameLogoCrystal } from './logoDeform';

const TAU = Math.PI * 2;

/** `body` values for {@link frameLogoGenerate}. */
export const BODY_CRYSTAL = 0;
export const BODY_PRINT = 1;
export const BODY_BLOOM = 2;
export const BODY_HELIX = 3;
export const BODY_VORTEX = 4;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function empty(): OrbFrame {
  return { dots: [], lines: [] };
}

interface Build {
  /** Mark amount, 0 = pure body, 1 = pure logo. */
  m: number;
  /** `1 - m`, the body's share. Everything the body does is weighted by it. */
  c: number;
  /** How much of the object has been made, in [0, 1]. */
  prog: number;
  /** True only while the work is actually happening — the head shows then. */
  stitching: boolean;
}

/**
 * The build clock, shared by every body.
 *
 * Work runs across the dwell, holds complete while the mark is showing, and
 * undoes itself on the way back, so the cycle arrives at its own start
 * already empty. Resetting at the boundary pops, and removing pops is what
 * this whole cycle was reshaped for — it is worth the four lines to get
 * right once here instead of five times below.
 */
function buildBeat(t: number, o: ModeOpts): Build {
  const dwell = o.dwell ?? 5.5;
  const morph = o.morph ?? 1.9;
  const b = beatAt(t, dwell, morph, 0, o.settle ?? 0.1, o.expo ?? 0.3);
  const into = b.local - dwell;
  const prog =
    b.local < dwell ? b.local / dwell : into < morph ? 1 : clamp01(1 - (into - morph) / morph);
  return { m: b.m, c: 1 - b.m, prog, stitching: b.local < dwell };
}

// --- Print: a vessel rising off a build plate, layer by layer ----------

/**
 * The silhouette of the printed body.
 *
 * A cylinder would be the obvious solid of revolution and the wrong one: it
 * has no shoulder, so as it rises there is nothing to anticipate and the
 * only information in the animation is height. A shouldered vessel widens,
 * turns and closes — you can see where it is going and watch it get there.
 */
function vesselProfile(u: number): number {
  return 0.36 + 0.52 * Math.sin(Math.PI * u ** 0.78) - 0.1 * Math.sin(TAU * u);
}

/**
 * The mark becomes a vessel being printed: a nozzle circles a build plate,
 * laying one layer of material at a time, and the object grows upward out
 * of nothing until the last layer closes and it is the logo.
 *
 * This is the only body whose unmade dots are not drawn at all. That is the
 * distinction it exists to make: a crystal is matter being WORKED, so its
 * unworked dots are present and dim, while a print is matter being ADDED,
 * and material that has not been extruded yet is not somewhere else — it is
 * nowhere. Fading it in would be describing a different machine.
 *
 * The head circles once per layer rather than sweeping the whole object,
 * which is what makes the motion read as a nozzle instead of a wipe: it is
 * fast where the work is and travels no distance at all in the build
 * direction, exactly like the real thing.
 */
const framePrint: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const { m, c, prog, stitching } = buildBeat(t, o);

  // Held tilt: seen straight on the layers collapse into a flat outline and
  // the thing that makes this a print — the stack — disappears.
  const pt = makeProj(
    (o.printYawAmp ?? 0.26) * Math.sin(t * (o.printYawRate ?? 0.24)) * c,
    (o.printTilt ?? 0.34) * c,
    cx,
    cx,
    R
  );

  const layers = Math.max(4, Math.round(o.layers ?? 11));
  const per = Math.ceil(n / layers);
  const height = o.vesselH ?? 1.62;
  const wide = o.vesselR ?? 0.78;
  const twist = o.layerTwist ?? 0.55;
  const spin = t * (o.printSpin ?? 0.12);

  const feather = Math.max(1e-4, o.feather ?? 0.03);
  const headW = Math.max(1e-4, o.headWidth ?? 0.012);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const layer = seat % layers;
    const u = layers > 1 ? layer / (layers - 1) : 0;
    // Position within the layer, in the order the nozzle lays it down.
    const around = (Math.floor(seat / layers) % per) / per;

    const ang = around * TAU + u * twist * TAU + spin;
    const rad = vesselProfile(u) * wide;

    const bx = Math.cos(ang) * rad;
    const by = (u - 0.5) * height;
    const bz = Math.sin(ang) * rad;

    // Layer-major: the whole of one layer before any of the next.
    const order = (layer + around) / layers;
    const done = clamp01((prog - order) / feather);
    const at = stitching ? Math.exp(-(((order - prog) / headW) ** 2)) : 0;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const [px, py, z] = pt(lx + (bx - lx) * c, ly + (by - ly) * c, lz + (bz - lz) * c);
    const zx = clamp01((z + 1) / 2);

    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.headR ?? 1.1) * at * c) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) - (o.headInk ?? 0.4) * at * c,
      // Not yet extruded, so not yet anywhere. Weighted by `c` so the mark
      // itself is never shown half-printed.
      a: 1 - (1 - done) * c
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Bloom: branches growing outward from a seed -----------------------

/**
 * The mark becomes a seed that grows: a handful of branches push outward,
 * curving and spreading into fronds, each with a bright tip where it is
 * still extending — and when they have all reached their length, the growth
 * is the logo.
 *
 * The one organic body in the set, and the only one with no symmetry to
 * fall back on. Everything else here is turned, stacked or coiled about an
 * axis; this is deliberately not, because a set of five bodies that are all
 * solids of revolution is one body with five profiles.
 *
 * Branches start at staggered times rather than together. Growing in
 * lockstep reads as a single object scaling up, which is the one reading to
 * avoid: scaling is not growing, and the difference is entirely in whether
 * the parts arrive at different times.
 */
const frameBloom: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const { m, c, prog, stitching } = buildBeat(t, o);

  const pt = makeProj(
    (o.bloomLean ?? 0.3) + (o.bloomYawAmp ?? 0.3) * Math.sin(t * (o.bloomYawRate ?? 0.22)) * c,
    (o.bloomTilt ?? 0.26) * c,
    cx,
    cx,
    R
  );

  const branches = Math.max(3, Math.round(o.branches ?? 8));
  // Each branch is a few parallel lanes rather than one line of dots. A
  // single lane with the spread hashed per dot reads as debris around a
  // wire — the offsets are uncorrelated, so nothing in the scatter follows
  // the branch. Lanes put every dot on a curve of its own that runs the
  // whole length, and the branch becomes a frond.
  const lanes = Math.max(1, Math.round(o.lanes ?? 3));
  const groups = branches * lanes;
  const per = Math.ceil(n / groups);
  const reach = o.reach ?? 0.82;
  const bend = o.bend ?? 0.5;
  const frond = o.frond ?? 0.38;
  const stagger = clamp01(o.growStagger ?? 0.26);
  // A slow sway, so a finished branch is still alive rather than parked.
  const sway = (o.sway ?? 0.05) * Math.sin(t * (o.swayRate ?? 0.6));

  const feather = Math.max(1e-4, o.feather ?? 0.04);
  const headW = Math.max(1e-4, o.headWidth ?? 0.02);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const br = seat % branches;
    const lane = Math.floor(seat / branches) % lanes;
    const s = per > 1 ? Math.min(1, Math.floor(seat / groups) / (per - 1)) : 0;

    // The branch's own frame: a direction, and two perpendiculars to bend
    // and spread in. Built from the branch index alone, so a branch is the
    // same shape every cycle and on every machine.
    const [dx, dy, dz] = fibDir(br, branches);
    const hx = hashD(br, 1.7) - 0.5;
    const hy = hashD(br, 4.3) - 0.5;
    const hz = hashD(br, 9.1) - 0.5;
    const dot = hx * dx + hy * dy + hz * dz;
    let ux = hx - dx * dot;
    let uy = hy - dy * dot;
    let uz = hz - dz * dot;
    const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy + uz * uz));
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = dy * uz - dz * uy;
    const vy = dz * ux - dx * uz;
    const vz = dx * uy - dy * ux;

    // Curvature grows as the square of the distance travelled, so a branch
    // leaves the seed straight and only turns once it has length — a line
    // that starts curving immediately reads as an arc, not as growth.
    const curve = bend * s * s + sway * s;
    // Lanes fan out as the branch lengthens, and each lane keeps its own
    // side for its whole length. The hash on top is small on purpose: just
    // enough that no two lanes are parallel, not enough to be scatter.
    const across = lanes > 1 ? lane / (lanes - 1) - 0.5 : 0;
    const wobble = (hashD(br * lanes + lane, 6.1) - 0.5) * 0.5;
    const side = (across + wobble * 0.4) * frond * s ** 1.25;
    const lift = (hashD(br * lanes + lane, 2.9) - 0.5) * frond * 0.5 * s ** 1.25;

    const len = s * reach;
    const bx = dx * len + ux * (curve + side) + vx * lift;
    const by = dy * len + uy * (curve + side) + vy * lift;
    const bz = dz * len + uz * (curve + side) + vz * lift;

    // Each branch opens at its own moment and then grows tip-outward.
    const start = hashD(br, 3.3) * stagger;
    // Slightly front-loaded: a branch that creeps out of the seed at a
    // constant rate spends its first second as a dot, and the frame is
    // empty for long enough to read as a stall rather than as a beginning.
    const order = start + s ** 0.85 * (1 - start);
    const done = clamp01((prog - order) / feather);
    const at = stitching ? Math.exp(-(((order - prog) / headW) ** 2)) : 0;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const [px, py, z] = pt(lx + (bx - lx) * c, ly + (by - ly) * c, lz + (bz - lz) * c);
    const zx = clamp01((z + 1) / 2);

    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.headR ?? 0.9) * at * c) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) - (o.headInk ?? 0.35) * at * c,
      // Tissue that has not grown yet does not exist yet.
      a: 1 - (1 - done) * c
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

// --- Helix: a double strand being transcribed --------------------------

/** One point on the double helix, in object space. */
function helixAt(u: number, strand: number, turns: number, rad: number, h: number, spin: number) {
  const ang = u * turns * TAU + strand * Math.PI + spin;
  return [Math.cos(ang) * rad, (u - 0.5) * h, Math.sin(ang) * rad] as const;
}

/**
 * The mark becomes a double helix that writes itself from the bottom up,
 * rung by rung, and closes into the logo at the top.
 *
 * The one body in the set made of two things instead of one, and the only
 * one that draws lines. Both are deliberate: the rungs are what separate a
 * helix from a coiled spring, and a spring is a shape this library can
 * already make three other ways. They are drawn only where the strand has
 * been transcribed, so the ladder builds along with its rails.
 *
 * Tall and narrow against four bodies that are round, which matters more
 * than it sounds — at spinner size the silhouette is most of what is left,
 * and two forms of similar proportion read as the same form.
 */
const frameHelix: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const { m, c, prog, stitching } = buildBeat(t, o);

  const pt = makeProj(
    (o.helixYawAmp ?? 0.5) * Math.sin(t * (o.helixYawRate ?? 0.3)) * c,
    (o.helixTilt ?? 0.12) * c,
    cx,
    cx,
    R
  );

  const turns = o.helixTurns ?? 2.4;
  const rad = o.helixR ?? 0.44;
  const height = o.helixH ?? 1.72;
  const spin = t * (o.helixSpin ?? 0.35);

  const feather = Math.max(1e-4, o.feather ?? 0.025);
  const headW = Math.max(1e-4, o.headWidth ?? 0.012);

  const steps = Math.ceil(n / 2);
  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    const strand = seat % 2;
    const k = Math.floor(seat / 2);
    const u = steps > 1 ? k / (steps - 1) : 0;

    const [bx, by, bz] = helixAt(u, strand, turns, rad, height, spin);

    // Both strands transcribe together, bottom to top — a single head with
    // two hands, not two independent builds.
    const order = u;
    const done = clamp01((prog - order) / feather);
    const at = stitching ? Math.exp(-(((order - prog) / headW) ** 2)) : 0;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const [px, py, z] = pt(lx + (bx - lx) * c, ly + (by - ly) * c, lz + (bz - lz) * c);
    const zx = clamp01((z + 1) / 2);

    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.headR ?? 1.2) * at * c) * rs,
      white: inkOf(o, zx, e[i] * m + (1 - m)) - (o.headInk ?? 0.4) * at * c,
      a: 1 - (1 - done) * c
    });
  }

  // The rungs. Every nth step rather than every step: a rung per dot pair
  // fills the helix in solid and the two rails stop being readable as two.
  const lines: Line[] = [];
  const every = Math.max(2, Math.round(o.rungEvery ?? 5));
  // Stroke width has a floor in device pixels, not a scale factor. Below
  // about half a pixel a line stops being drawn and becomes a smudge, which
  // is how an earlier state lost its wires at icon size.
  const lw = Math.max(0.55, (o.rungW ?? 0.9) * rs);
  for (let k = 0; k < steps; k += every) {
    const u = steps > 1 ? k / (steps - 1) : 0;
    const done = clamp01((prog - u) / feather);
    const alpha = done * c * (o.rungA ?? 0.55);
    if (alpha < 0.02) continue;
    const [ax, ay, az] = helixAt(u, 0, turns, rad, height, spin);
    const [bx2, by2, bz2] = helixAt(u, 1, turns, rad, height, spin);
    const [x1, y1] = pt(ax, ay, az);
    const [x2, y2, z2] = pt(bx2, by2, bz2);
    lines.push({
      x1,
      y1,
      x2,
      y2,
      white: inkOf(o, clamp01((z2 + 1) / 2), 1),
      a: alpha,
      w: lw
    });
  }

  return finalizeFrame(dots, lines, o.rMin);
};

// --- Vortex: a disc of raw material draining into a core ---------------

/**
 * The mark becomes a spinning disc of loose material that drains inward:
 * particle by particle, from the inside out, the disc is pulled into a
 * dense bright core — and the core is the logo.
 *
 * The inverse of every other body here, and the reason it earns a slot. The
 * other four ADD: nothing exists, then something does. This one starts with
 * everything already on screen as raw material and generation is the act of
 * gathering it. Both readings of "generating" are true and they look
 * nothing alike.
 *
 * The disc rotates differentially — inner faster, as gravity actually
 * works. A rigid rotation reads as a spinning plate, a texture turning; the
 * shear is what makes it read as loose matter under a force.
 */
const frameVortex: ModeFrame = (size, t, o, logo) => {
  if (!logo) return empty();
  const { p, e, n } = logo.points;
  const seats = logo.seats;
  const cx = size / 2;
  const R = (size / 2) * 0.82;
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const { m, c, prog, stitching } = buildBeat(t, o);

  // A strong held tilt: seen face on this is a flat spiral and the collapse
  // has nowhere to read as depth; seen edge on it is a line.
  const pt = makeProj(
    (o.vortexYawAmp ?? 0.18) * Math.sin(t * (o.vortexYawRate ?? 0.2)) * c,
    (o.vortexTilt ?? 0.62) * c,
    cx,
    cx,
    R
  );

  const outer = o.discR ?? 1.06;
  const coreR = o.coreR ?? 0.17;
  const swirl = o.swirl ?? 1.9;
  const thick = o.discThick ?? 0.15;
  const rate = o.vortexRate ?? 0.3;
  const golden = Math.PI * (3 - Math.sqrt(5));

  const feather = Math.max(1e-4, o.feather ?? 0.05);
  const headW = Math.max(1e-4, o.headWidth ?? 0.02);

  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const seat = seats[i];
    // Square root, so the dots spread evenly over the disc's AREA. Linear
    // radius crowds the centre and leaves the rim starved, which reads as a
    // bullseye rather than as a field of material.
    const q = Math.sqrt((seat + 0.5) / n);

    // Inside first: the disc empties from its centre outward, so the core
    // is built from the beginning and the rim is the last thing to fall.
    const order = q;
    const done = clamp01((prog - order) / feather);
    const at = stitching ? Math.exp(-(((order - prog) / headW) ** 2)) : 0;

    // Where the particle actually is: out on the disc until it is taken,
    // then packed into the core at its own depth.
    const seated = coreR * (0.35 + 0.65 * hashD(seat, 5.5));
    const rq = q * outer + (seated - q * outer) * done;
    // Rate follows the CURRENT radius, so a particle spins up as it falls
    // in — the core whirls, the rim crawls.
    const w = rate / (0.12 + (rq / outer) ** 1.5);
    const ang = seat * golden + q * swirl * TAU + t * w;

    const flat = (hashD(seat, 8.1) - 0.5) * thick * (1 - 0.7 * q);
    const bx = Math.cos(ang) * rq;
    const by = flat * (1 - done) + (hashD(seat, 3.7) - 0.5) * coreR * 1.2 * done;
    const bz = Math.sin(ang) * rq;

    const lx = p[i * 3];
    const ly = p[i * 3 + 1];
    const lz = p[i * 3 + 2];
    const [px, py, z] = pt(lx + (bx - lx) * c, ly + (by - ly) * c, lz + (bz - lz) * c);
    const zx = clamp01((z + 1) / 2);

    // Raw material is present and neutral; taken material carries the
    // brand. Nothing is hidden here — the disc IS the subject.
    const unlit = (1 - done) * c;
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.55) + (o.rDepth ?? 1.4) * zx + (o.headR ?? 0.8) * at * c) * rs,
      white:
        inkOf(o, zx, e[i] * m + (1 - m)) + (o.unlitInk ?? 0.34) * unlit - (o.headInk ?? 0.3) * at * c,
      k: 1 - unlit
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

/**
 * `generating`, dispatched to one of five bodies.
 *
 * A dispatcher rather than five states, because these are five answers to
 * the same question and a product picks one: a caller writes
 * `state="generating"` and tunes `body`, exactly as it would pick a colour.
 * Five states would mean five entries in every switch that handles a state,
 * for a distinction that belongs one level down.
 */
export const frameLogoGenerate: ModeFrame = (size, t, o, logo) => {
  const body = o.body ?? BODY_CRYSTAL;
  if (body === BODY_PRINT) return framePrint(size, t, o, logo);
  if (body === BODY_BLOOM) return frameBloom(size, t, o, logo);
  if (body === BODY_HELIX) return frameHelix(size, t, o, logo);
  if (body === BODY_VORTEX) return frameVortex(size, t, o, logo);
  return frameLogoCrystal(size, t, o, logo);
};
