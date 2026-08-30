// The objects `generating` can build, in `body` order.
//
// Names live here rather than in the engine: the engine ships numbers, and
// a label is a demo concern. The index IS the `body` value, so the catalogue
// page and the playground picker cannot drift from the engine's constants.
export const BODY_NAMES = [
  'crystal',
  'vessel',
  'frond',
  'helix',
  'torus',
  'nautilus',
  'armillary',
  'mobius',
  'lattice',
  'knot',
  'tower',
  'hourglass',
  'yarn',
  'gear',
  'tree',
  'lantern',
  'scroll',
  'galaxy'
] as const;

/** One line on what each object is, for the catalogue. */
export const BODY_NOTES: string[] = [
  'an octahedron, cut along a spiral',
  'a turned vessel, layer by layer',
  'branches out of one seed',
  'a double strand, rung by rung',
  'a ring, wound a turn at a time',
  'a logarithmic shell, chamber by chamber',
  'nested hoops on different axes',
  'a band with a half twist',
  'a ball quantised onto a grid',
  'an overhand knot in a thick cord',
  'stepped storeys on a square plan',
  'two cones filling toward the waist',
  'one strand wound over a ball',
  'a toothed wheel, cut around',
  'trunk, boughs, twigs',
  'a paper lamp, rib by rib',
  'a sheet rolling itself up',
  'a disc realised from the core out'
];
