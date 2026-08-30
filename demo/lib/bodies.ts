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
// Every one of these is the orb or something the orb could become. Forms
// that were recognisable OBJECTS — a vessel, a tower, a cog, a tree, a
// coiled shell — animated well and are gone anyway: a spinner that reads as
// a picture of a pot makes the mark the second thing anyone looks at.
export const BODY_NAMES = [
  'crystal',
  'torus',
  'lattice',
  'yarn',
  'lantern',
  'mobius',
  'helix',
  'armillary',
  'knot',
  'galaxy'
] as const;

/** One line on what each object is, for the catalogue. */
export const BODY_NOTES: string[] = [
  'the orb cut into an octahedron',
  'a ring, wound a turn at a time',
  'the orb quantised onto a grid',
  'one strand lapping a ball',
  'the orb closed meridian by meridian',
  'a band with a half twist',
  'a double strand, rung by rung',
  'the orb reduced to its great circles',
  'a trefoil in a thick cord',
  'the orb flattened into a turning disc'
];
