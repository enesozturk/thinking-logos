// The `thinking-logos/bake` entry point: artwork → point set.
//
// Split from the runtime on purpose. This half needs a DOM and runs once;
// the engine half needs neither and runs 60 times a second. Importing only
// the engine in a React Native or worker build drops all of this.

export { bakeLogo, serializeLogo, deserializeLogo, recommendedCount } from './bake';
export type { BakeOptions, LogoSource } from './bake';
export type { LogoPointSet, LogoStyle, ShellMode } from '../engine/cloud';
export type { ShellPoint } from './shell';
export { buildShell, edgeDistance } from './shell';
export type { AlphaMask } from './mask';
export { rasterizeSvg, rasterizePath, rasterizeImage, trimAndCenter } from './mask';
export type { Pt } from './contour';
export { traceContours, sampleOutline, resampleLoop, loopLength } from './contour';
export { samplePoisson, fillToCount, rng } from './fill';
