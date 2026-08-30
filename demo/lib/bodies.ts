// The bodies `generating` can realise, in `body` order.
//
// Under `lib/` rather than beside `brands.ts` for one blunt reason: the
// catalogue page is served at `/bodies`, and Vite's dev server resolves that
// request against `demo/bodies.ts` — extensionless module resolution runs
// before the SPA fallback — so the page came back as its own transpiled
// source. The built site never showed it, because there the route is a real
// directory. A module must not share a name with a route.
//
// Names live here rather than in the engine: the engine ships numbers, and
// a label is a demo concern. The index IS the `body` value, so the catalogue
// page and the playground picker cannot drift from the engine's constants.
//
// Every one of these is the orb or something the orb could become, and every
// one has volume. Two families were tried and cut: recognisable OBJECTS (a
// vessel, a tower, a cog) make the viewer read a picture of that object, and
// WIRES (a möbius band, a helix, nested hoops, a trefoil) are lines drawn in
// space, with no matter for the work to be done to.
export const BODY_NAMES = [
  'lattice',
  'diffusion',
  'voxel',
  'raster',
  'shells',
  'yarn',
  'torus',
  'crystal'
] as const;

/** One line on what each object is, for the catalogue. */
export const BODY_NOTES: string[] = [
  'the orb quantised onto a grid',
  'the orb resolving out of noise',
  'a cube of blocks, opening from the core out',
  'the orb drawn row by row',
  'an onion thickened from the core out',
  'four strands lapping a ball, stitch by stitch',
  'a ring, wound a turn at a time',
  'the orb cut into an octahedron'
];
