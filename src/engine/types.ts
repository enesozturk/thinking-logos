// Engine-level contracts shared by every mode implementation.

import type { LogoPointSet, SeatMap } from './cloud';
import type { ModeOpts } from './profiles';

export type { Dot, Line, OrbFrame } from './core';

import type { OrbFrame } from './core';

/**
 * A baked mark plus its resolved sphere pairing — everything a logo mode
 * needs that is not a tuning scalar.
 *
 * It is a separate argument rather than a member of `ModeOpts` on purpose.
 * `ModeOpts` is a flat bag of numbers a Reanimated worklet can capture
 * wholesale; typed arrays are a different kind of thing with different
 * copying rules, and folding them in would have meant every existing mode's
 * option reads widening from `number` to a union. Keeping them apart makes
 * the distinction between *tuning* and *content* explicit in the type.
 */
export interface LogoBinding {
  readonly points: LogoPointSet;
  readonly seats: SeatMap;
}

/**
 * Geometry for one instant: pure math over (size, t, opts), no rendering
 * surface and no theme — `dark` only affects ink at paint time.
 *
 * Deliberately closure-free and `Math`-only so the same function can run
 * inside a Reanimated worklet on the React Native UI thread, and so its
 * output can be compared numerically against the Swift port.
 *
 * `logo` is supplied only for the logo modes; the nine orb modes ignore it
 * and are declared with three parameters, which stays assignable.
 */
export type ModeFrame = (size: number, t: number, opts: ModeOpts, logo?: LogoBinding) => OrbFrame;

/** One frame painter: draws a mode into a 2D context at CSS-px `size`. */
export type ModeDraw = (
  ctx: CanvasRenderingContext2D,
  size: number,
  t: number,
  dark: boolean,
  opts: ModeOpts,
  logo?: LogoBinding
) => void;
