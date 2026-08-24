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
  frameLogoAssemble,
  frameLogoWork,
  frameLogoScan,
  seatMap
} from './engine/logo';
import { frameLogoCrystal, frameLogoSolve, frameLogoWait, frameLogoWave } from './engine/logoDeform';

export type LogoMode =
  | 'assemble'
  | 'scan'
  | 'work'
  | 'solve'
  | 'wave'
  | 'wait'
  | 'crystal';

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
  | 'solving'
  | 'listening'
  | 'waiting'
  | 'generating';

export const LOGO_STATE_TO_MODE: Record<LogoState, LogoMode> = {
  thinking: 'assemble',
  searching: 'scan',
  working: 'work',
  solving: 'solve',
  listening: 'wave',
  waiting: 'wait',
  generating: 'crystal'
};

export const LOGO_MODE_FRAMES: Record<LogoMode, ModeFrame> = {
  assemble: frameLogoAssemble,
  scan: frameLogoScan,
  work: frameLogoWork,
  solve: frameLogoSolve,
  wave: frameLogoWave,
  wait: frameLogoWait,
  crystal: frameLogoCrystal
};

export interface LogoPreset {
  speed: number;
  opts: ModeOpts;
}

/**
 * Every state dwells for the same 5.5s.
 *
 * The cycle is `dwell + 2 * morph`, and `morph` is 1.9 throughout, so a
 * shared dwell is what makes every mark reach its logo on the same frame.
 * They previously ran 7.8s, 8.3s and 9.3s, which drift apart on sight and
 * make a grid of them impossible to film as a loop.
 *
 * 5.5 rather than the old minimum of 4 because `solve` needs that long —
 * its scramble has to run and reverse inside the dwell and still read.
 * Levelling upward costs the other states nothing; levelling down would
 * have taken the solve apart.
 */
export const LOGO_PRESETS: Record<LogoMode, LogoPreset> = {
  assemble: {
    speed: 1,
    opts: {
      dwell: 5.5,
      turns: 1,
      morph: 1.9,
      expo: 0.3,
      settle: 0.1,
      tiltAmp: 0.34,
      stagger: 0,
      arc: 0,
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
      dwell: 5.5,
      turns: 1,
      morph: 1.9,
      expo: 0.3,
      settle: 0.1,
      tiltAmp: 0.34,
      sphereR: 0.94,
      poleEase: 1.4,
      arms: 13,
      armDepth: 0.72,
      armInk: 0.24,
      scanRate: 0.85,
      scanSwing: 1.05,
      scanWidth: 0.22,
      dimBase: 0.4,
      rBoost: 1.3,
      scanInk: 0.3,
      rBase: 0.5,
      rDepth: 1.4,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  work: {
    speed: 1,
    opts: {
      dwell: 5.5,
      morph: 1.9,
      expo: 0.3,
      settle: 0.1,
      turns: 0,
      lean: 0.4,
      yawAmp: 0.3,
      yawRate: 0.26,
      tilt: 0.4,
      wraps: 3,
      knotTurns: 2,
      major: 0.62,
      minor: 0.3,
      spin: 0.24,
      feather: 0.02,
      headWidth: 0.01,
      headR: 1.2,
      headInk: 0.4,
      rBase: 0.75,
      rDepth: 1.6,
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
      dwell: 5.5,
      turns: 1,
      morph: 1.9,
      expo: 0.3,
      settle: 0.1,
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
      dwell: 5.5,
      morph: 1.9,
      expo: 0.3,
      settle: 0.1,
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
  wait: {
    speed: 1,
    opts: {
      dwell: 5.5,
      morph: 1.9,
      expo: 0.3,
      settle: 0.1,
      turns: 0,
      yawAmp: 0.22,
      yawRate: 0.3,
      tilt: 0.42,
      rings: 9,
      height: 1.5,
      wide: 0.82,
      taper: 0.78,
      breatheRate: 0.75,
      breatheAmp: 0.2,
      spin: 0.16,
      loudR: 0.25,
      loudInk: 0.12,
      rBase: 0.55,
      rDepth: 1.4,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  crystal: {
    speed: 1,
    opts: {
      dwell: 5.5,
      morph: 1.9,
      expo: 0.3,
      settle: 0.1,
      turns: 0,
      lean: 0.5,
      yawAmp: 0.24,
      yawRate: 0.32,
      tilt: 0.2,
      crystalR: 0.94,
      spin: 0.3,
      feather: 0.03,
      headWidth: 0.012,
      headR: 1.1,
      headInk: 0.4,
      unlitInk: 0.3,
      rBase: 0.55,
      rDepth: 1.4,
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
  return {
    mode,
    frame: LOGO_MODE_FRAMES[mode],
    speed: preset.speed,
    opts,
    binding: { points, seats: seatMap(points) }
  };
}
