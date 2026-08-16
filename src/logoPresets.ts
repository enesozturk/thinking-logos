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
  buildGraph,
  frameLogoAssemble,
  frameLogoOrbit,
  frameLogoScan,
  frameLogoSpin,
  frameLogoUnrest,
  seatMap
} from './engine/logo';
import {
  frameLogoBreathe,
  frameLogoConnect,
  frameLogoSolve,
  frameLogoWave,
  frameLogoWeave
} from './engine/logoDeform';

export type LogoMode =
  | 'assemble'
  | 'spin'
  | 'scan'
  | 'unrest'
  | 'orbit'
  | 'solve'
  | 'wave'
  | 'connect'
  | 'weave'
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
  | 'idle'
  | 'searching'
  | 'working'
  | 'orbiting'
  | 'solving'
  | 'listening'
  | 'connecting'
  | 'weaving'
  | 'breathing';

export const LOGO_STATE_TO_MODE: Record<LogoState, LogoMode> = {
  thinking: 'assemble',
  idle: 'spin',
  searching: 'scan',
  working: 'unrest',
  orbiting: 'orbit',
  solving: 'solve',
  listening: 'wave',
  connecting: 'connect',
  weaving: 'weave',
  breathing: 'breathe'
};

export const LOGO_MODE_FRAMES: Record<LogoMode, ModeFrame> = {
  assemble: frameLogoAssemble,
  spin: frameLogoSpin,
  scan: frameLogoScan,
  unrest: frameLogoUnrest,
  orbit: frameLogoOrbit,
  solve: frameLogoSolve,
  wave: frameLogoWave,
  connect: frameLogoConnect,
  weave: frameLogoWeave,
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
      spin: 2,
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
      yawAmp: 0.26,
      yawRate: 0.55,
      tiltAmp: 0.12,
      travelShare: 0.16,
      travelRate: 0.34,
      orbitR: 1.06,
      partBoost: 0.5,
      partInk: 0.22,
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
      spin: 1.5,
      tiltAmp: 0.38,
      cubeHalf: 0.6,
      sphereR: 0.86,
      moveCount: 6,
      slotDur: 0.32,
      rest: 0.36,
      stagger: 0.7,
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
      tilt: 0.05,
      beat: 1.9,
      bounce: 0.075,
      squash: 0.045,
      ripple: 0.22,
      rippleK: 2.6,
      rippleRate: 2.4,
      rippleInk: 0.18,
      rBase: 0.5,
      rDepth: 1.2,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  connect: {
    speed: 1,
    opts: {
      yawAmp: 0.18,
      yawRate: 0.5,
      tiltAmp: 0.08,
      nodeCount: 26,
      reach: 1.5,
      wirePeriod: 3.6,
      wireSharp: 3.2,
      signals: 6,
      signalRate: 0.6,
      nodeR: 1.15,
      nodeRDepth: 1.2,
      lineW: 0.9,
      lineA: 0.8,
      lineInk: 0.3,
      partR: 1.05,
      partRDepth: 1.1,
      rBase: 0.5,
      rDepth: 1.3,
      inkFar: 0.6,
      inkSpan: 0.5,
      inkRim: 0.16,
      rsPow: 0.6,
      rMin: 0.3
    }
  },
  weave: {
    speed: 1,
    opts: {
      tilt: 0.06,
      rows: 9,
      slide: 0.22,
      slideRate: 1.15,
      rowLag: 3.14159,
      strayInk: 0.1,
      rBase: 0.55,
      rDepth: 1.2,
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
      yawAmp: 0.14,
      tiltAmp: 0.07,
      breathe: 0.05,
      breatheRate: 0.85,
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
  const graph =
    mode === 'connect' ? buildGraph(points, opts.nodeCount ?? 34, opts.reach ?? 1.55) : undefined;
  return {
    mode,
    frame: LOGO_MODE_FRAMES[mode],
    speed: preset.speed,
    opts,
    binding: { points, seats: seatMap(points), nodes: graph?.nodes, edges: graph?.edges }
  };
}
