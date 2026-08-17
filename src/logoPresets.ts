// Tunings for the logo modes.
//
// Deliberately shaped differently from the orb presets. An orb is a fixed
// design shipped at two hand-tuned sizes, so its presets are indexed by
// (state × size). A logo is baked per use — the dot COUNT is chosen at bake
// time to suit the rendered size — so there is nothing left for a size
// preset to vary except radii, and `radiusScale` already does that
// sub-linearly. One tuning per state is the whole table.

import type { LogoPointSet } from './engine/cloud';
import type { LogoBinding, ModeFrame } from './engine/types';
import type { ModeOpts } from './engine/profiles';
import {
  buildGlobe,
  frameLogoAssemble,
  frameLogoOrbit,
  frameLogoScan,
  frameLogoUnrest,
  seatMap
} from './engine/logo';
import { frameLogoBreathe, frameLogoSolve, frameLogoWave } from './engine/logoDeform';

export type LogoMode =
  | 'assemble'
  | 'scan'
  | 'unrest'
  | 'orbit'
  | 'solve'
  | 'wave'
  | 'breathe';

/**
 * What the mark is doing.
 *
 * The verbs are the orb states' verbs on purpose, and nine of the ten line
 * up one-for-one. A product can swap a generic orb for its own logo without
 * renaming a single call site — and, more usefully, can run both in the
 * same UI and have them mean the same thing.
 */
export type LogoState =
  | 'thinking'
  | 'searching'
  | 'working'
  | 'orbiting'
  | 'solving'
  | 'listening'
  | 'breathing';

export const LOGO_STATE_TO_MODE: Record<LogoState, LogoMode> = {
  thinking: 'assemble',
  searching: 'scan',
  working: 'unrest',
  orbiting: 'orbit',
  solving: 'solve',
  listening: 'wave',
  breathing: 'breathe'
};

export const LOGO_MODE_FRAMES: Record<LogoMode, ModeFrame> = {
  assemble: frameLogoAssemble,
  scan: frameLogoScan,
  unrest: frameLogoUnrest,
  orbit: frameLogoOrbit,
  solve: frameLogoSolve,
  wave: frameLogoWave,
  breathe: frameLogoBreathe
};

export interface LogoPreset {
  speed: number;
  opts: ModeOpts;
}

export const LOGO_PRESETS: Record<LogoMode, LogoPreset> = {
  assemble: {
    speed: 1,
    opts: {
      dwell: 4,
      turns: 1,
      morph: 1.9,
      breathDur: 0.35,
      expo: 0.3,
      settle: 0.45,
      breathe: 0.07,
      breatheR: 0.22,
      breatheInk: 0.14,
      tiltAmp: 0.34,
      stagger: 0.55,
      arc: 0.2,
      churn: 0.09,
      sphereR: 0.92,
      flightFade: 0.25,
      haloShare: 0.12,
      haloOut: 0.18,
      haloZ: 0.8,
      haloRate: 0.9,
      haloR: 0.22,
      rBase: 0.55,
      rDepth: 1.5,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  scan: {
    speed: 1,
    opts: {
      dwell: 4,
      turns: 1,
      morph: 1.9,
      breathDur: 0.35,
      expo: 0.3,
      settle: 0.45,
      breathe: 0.07,
      breatheR: 0.22,
      breatheInk: 0.14,
      tiltAmp: 0.34,
      sphereR: 0.94,
      meridians: 6,
      parallels: 5,
      scanRate: 2.1,
      scanWidth: 0.5,
      dimBase: 0.55,
      rBoost: 1,
      rBase: 0.5,
      rDepth: 1.4,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  unrest: {
    speed: 1,
    opts: {
      dwell: 4,
      morph: 1.9,
      breathDur: 0.35,
      expo: 0.3,
      settle: 0.45,
      breathe: 0.07,
      yawAmp: 0.32,
      yawRate: 0.32,
      tiltAmp: 0.26,
      rings: 7,
      ringR: 0.92,
      ringSpin: 0.42,
      courierShare: 0.16,
      courierRate: 0.26,
      wave: 0.35,
      cargoR: 0.85,
      cargoInk: 0.32,
      rBase: 0.5,
      rDepth: 1.3,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  orbit: {
    speed: 1,
    opts: {
      yawAmp: 0.2,
      yawRate: 0.5,
      tiltAmp: 0.1,
      travelShare: 0.3,
      travelRate: 0.22,
      travelSwing: 0.5,
      reach: 0.12,
      reachVary: 0.16,
      orbitZ: 0.35,
      partBoost: 0.4,
      partInk: 0.18,
      rBase: 0.55,
      rDepth: 1.4,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  solve: {
    speed: 1,
    opts: {
      // The solve needs more room than a plain dwell: the palindrome has to
      // scramble and unscramble inside it and still be legible.
      dwell: 5.5,
      turns: 1,
      morph: 1.9,
      breathDur: 0.35,
      expo: 0.3,
      settle: 0.45,
      breathe: 0.07,
      breatheR: 0.22,
      breatheInk: 0.14,
      tiltAmp: 0.36,
      cubeHalf: 0.62,
      moveCount: 6,
      rActive: 0.3,
      rBase: 0.55,
      rDepth: 1.4,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  wave: {
    speed: 1,
    opts: {
      dwell: 4,
      morph: 1.9,
      breathDur: 0.35,
      expo: 0.3,
      settle: 0.45,
      breathe: 0.07,
      breatheR: 0.22,
      breatheInk: 0.14,
      yawAmp: 0.42,
      yawRate: 0.55,
      tiltAmp: 0.26,
      wide: 1.12,
      tall: 0.5,
      waveK: 3.1,
      waveK2: 6.7,
      waveRate: 1.9,
      swing: 0.52,
      lumps: 0.12,
      loudR: 0.3,
      loudInk: 0.14,
      rBase: 0.55,
      rDepth: 1.5,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  breathe: {
    speed: 1,
    opts: {
      dwell: 4,
      morph: 1.9,
      breathDur: 0.35,
      expo: 0.3,
      settle: 0.45,
      breathe: 0.07,
      yawAmp: 0.3,
      yawRate: 0.4,
      tiltAmp: 0.18,
      ballR: 0.86,
      swell: 0.34,
      swellRate: 0.9,
      pulse: 0.09,
      pulseRate: 1.1,
      loudR: 0.3,
      loudInk: 0.14,
      rBase: 0.55,
      rDepth: 1.5,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  }
};

export interface ResolvedLogo {
  mode: LogoMode;
  frame: ModeFrame;
  speed: number;
  opts: ModeOpts;
  binding: LogoBinding;
}

/**
 * Resolve a state and a baked mark into everything the render loop needs.
 *
 * The seat map is built here — once per (points, state) pair — rather than
 * inside the frame function, because it costs two sorts and the frame
 * function runs sixty times a second on what may be a native UI thread.
 * `overrides` is merged last so a caller can retune a single knob without
 * restating a preset.
 */
export function resolveLogo(
  state: LogoState,
  points: LogoPointSet,
  overrides?: ModeOpts
): ResolvedLogo {
  const mode = LOGO_STATE_TO_MODE[state];
  const preset = LOGO_PRESETS[mode];
  const opts = { ...preset.opts, ...overrides };
  // The constellation graph costs a farthest-point pass and a quadratic
  // edge test, so it is only built for the one state that reads it.
  const globe =
    mode === 'scan' ? buildGlobe(points, opts.meridians ?? 6, opts.parallels ?? 5) : undefined;
  return {
    mode,
    frame: LOGO_MODE_FRAMES[mode],
    speed: preset.speed,
    opts,
    binding: { points, seats: seatMap(points), globe }
  };
}
