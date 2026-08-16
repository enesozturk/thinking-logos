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
  frameLogoOrbit,
  frameLogoScan,
  frameLogoSpin,
  frameLogoUnrest,
  seatMap
} from './engine/logo';

export type LogoMode = 'assemble' | 'spin' | 'scan' | 'unrest' | 'orbit';

/**
 * What the mark is doing. The verbs mirror the orb states so a product can
 * swap a generic orb for its own logo without renaming anything.
 */
export type LogoState = 'thinking' | 'idle' | 'searching' | 'working' | 'orbiting';

export const LOGO_STATE_TO_MODE: Record<LogoState, LogoMode> = {
  thinking: 'assemble',
  idle: 'spin',
  searching: 'scan',
  working: 'unrest',
  orbiting: 'orbit'
};

export const LOGO_MODE_FRAMES: Record<LogoMode, ModeFrame> = {
  assemble: frameLogoAssemble,
  spin: frameLogoSpin,
  scan: frameLogoScan,
  unrest: frameLogoUnrest,
  orbit: frameLogoOrbit
};

export interface LogoPreset {
  speed: number;
  opts: ModeOpts;
}

export const LOGO_PRESETS: Record<LogoMode, LogoPreset> = {
  assemble: {
    speed: 1,
    opts: {
      spin: 0.85,
      tiltAmp: 0.34,
      stagger: 0.75,
      arc: 0.22,
      churn: 0.09,
      sphereR: 0.92,
      flightFade: 0.25,
      rBase: 0.55,
      rDepth: 1.5,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  spin: {
    speed: 1,
    opts: {
      yawAmp: 0.55,
      yawRate: 0.9,
      tiltAmp: 0.16,
      tiltRate: 0.63,
      breathe: 0.02,
      breatheRate: 1.4,
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
    speed: 1.35,
    opts: {
      yawAmp: 0.34,
      yawRate: 0.7,
      tiltAmp: 0.1,
      scanRate: 1.6,
      scanWidth: 0.26,
      dimBase: 0.45,
      rBase: 0.5,
      rDepth: 1.3,
      rBoost: 1.1,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.12,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  unrest: {
    speed: 1.1,
    opts: {
      yawAmp: 0.22,
      tiltAmp: 0.09,
      unrest: 0.045,
      unrestRate: 0.9,
      rBase: 0.55,
      rDepth: 1.4,
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
      yawAmp: 0.3,
      yawRate: 0.7,
      tiltAmp: 0.1,
      breathe: 0.015,
      orbitSpin: 0.9,
      orbitTilt: 0.38,
      orbitN: 3,
      perOrbit: 2,
      orbitR: 1.02,
      partR: 0.9,
      partRDepth: 1.2,
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
  return {
    mode,
    frame: LOGO_MODE_FRAMES[mode],
    speed: preset.speed,
    opts: { ...preset.opts, ...overrides },
    binding: { points, seats: seatMap(points) }
  };
}
