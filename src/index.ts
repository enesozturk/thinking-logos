// thinking-logos — your mark, animated with the thinking-orbs engine.
//
// A superset of thinking-orbs: the nine procedural orb states are here
// unchanged, plus five states that animate baked artwork instead of a
// generated sphere. Dropping `ThinkingOrb` in and swapping it for
// `ThinkingLogo` later changes nothing else.

export { ThinkingOrb } from './ThinkingOrb';
export type { ThinkingOrbProps, OrbState, OrbSize, OrbTheme } from './types';

export { ThinkingLogo } from './ThinkingLogo';
export type { ThinkingLogoProps } from './ThinkingLogo';

// Baking: artwork → point set. Needs a DOM; import from `thinking-logos/bake`
// directly in a build script to keep it out of a runtime-only bundle.
export { bakeLogo, serializeLogo, deserializeLogo, recommendedCount } from './bake/bake';
export type { BakeOptions, LogoSource } from './bake/bake';
export { useBakedLogo, bakeCached } from './useBakedLogo';
export type { BakedLogoResult } from './useBakedLogo';

export type { LogoPointSet, LogoStyle, ShellMode, SeatMap } from './engine/cloud';
export type { LogoState, LogoMode, LogoPreset, ResolvedLogo } from './logoPresets';
export { resolveLogo, LOGO_PRESETS, LOGO_STATE_TO_MODE, LOGO_MODE_FRAMES } from './logoPresets';

// `generating` is not one form but ten — the orb cut into an octahedron,
// wound into a ball of yarn, quantised onto a grid, flattened into a disc.
// Pass one as `tune={{ body: BODY_LATTICE }}`.
export {
  BODY_CRYSTAL,
  BODY_TORUS,
  BODY_LATTICE,
  BODY_YARN,
  BODY_LANTERN,
  BODY_MOBIUS,
  BODY_HELIX,
  BODY_ARMILLARY,
  BODY_KNOT,
  BODY_GALAXY,
  BODY_COUNT
} from './engine/logoGenerate';

// Power-user surface: the resolved presets + raw frame painters, for
// consumers driving their own canvas outside React.
export { resolvePreset, STATE_TO_MODE, type ModeKey, type Resolved } from './presets';
export { MODE_DRAWS } from './engine/registry';
export { paintFrameTinted, parseTint, adaptTint } from './engine/tint';
export type { Rgb } from './engine/tint';
