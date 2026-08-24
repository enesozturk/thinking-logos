// The ThinkingLogo component: your mark, animated like the orbs.
//
// Shares ThinkingOrb's render discipline exactly — one shared clock so every
// mounted instance stays in phase, a per-instance rAF loop that stops while
// offscreen or on a hidden tab, and a single static frame for viewers who
// asked for reduced motion. The only additions are the bake (async, cached,
// shared across instances) and the optional brand tint.

import type { CSSProperties, CanvasHTMLAttributes } from 'react';
import { useEffect, useRef } from 'react';
import type { BakeOptions, LogoSource } from './bake/bake';
import { recommendedCount } from './bake/bake';
import type { LogoPointSet } from './engine/cloud';
import type { ModeOpts } from './engine/profiles';
import { paintFrame } from './engine/core';
import { adaptTint, parseTint, paintFrameTinted } from './engine/tint';
import type { LogoState } from './logoPresets';
import { resolveLogo } from './logoPresets';
import { useResolvedDark, useReducedMotion } from './theme';
import type { OrbTheme } from './types';
import { useBakedLogo } from './useBakedLogo';

/**
 * One clock for every mounted instance, advanced once per animation frame.
 *
 * Wall-clock time is the obvious source and it has a failure this library
 * cannot afford: any long task — a bake, a syntax highlight, a slow
 * extension — stops the frames but not the clock, so the animation resumes
 * by jumping forward by however long the page was busy. Read on load it
 * looks like the mark freezes and then fast-forwards, which is exactly what
 * it is.
 *
 * Accumulating per frame with a ceiling on the step means a stall pauses the
 * animation instead of skipping it. Every instance reads the same
 * accumulator, so they stay in step with each other however they mount —
 * the property the old shared wall clock was there for.
 */
const MAX_STEP = 0.1;
let clockSeconds = 0;
let lastStamp = -1;

function tick(stamp: number): number {
  if (stamp === lastStamp) return clockSeconds;
  // Frames within one rAF callback share a timestamp, so the first instance
  // to run advances the clock and the rest read what it wrote.
  const step = lastStamp < 0 ? 0 : Math.min((stamp - lastStamp) / 1000, MAX_STEP);
  lastStamp = stamp;
  clockSeconds += step;
  return clockSeconds;
}

const LABELS: Record<LogoState, string> = {
  thinking: 'Thinking…',
  searching: 'Searching…',
  working: 'Working…',
  solving: 'Solving…',
  listening: 'Listening…',
  waiting: 'Waiting…',
  generating: 'Generating…'
};

export interface ThinkingLogoProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'style'> {
  /** Artwork to bake, or a point set baked earlier. */
  logo: LogoSource | LogoPointSet;

  /** What the mark is doing. @default 'thinking' */
  state?: LogoState;

  /** Rendered size in CSS pixels. @default 64 */
  size?: number;

  /** Theme mode; `auto` detects from the host project. @default 'auto' */
  theme?: OrbTheme;

  /**
   * Brand colour as `#rrggbb`. Replaces the hue only — depth still reads
   * through the ink ramp. Omit for the default monochrome.
   */
  tint?: string;

  /** Animation speed multiplier over the preset. @default 1 */
  speed?: number;

  /** Freeze on the current frame. @default false */
  paused?: boolean;

  /**
   * Begin the cycle with the mark assembled rather than wherever the shared
   * clock happens to be, and share one origin with every other instance
   * that asks for it.
   *
   * For recording. A loop that starts mid-transformation has no natural cut
   * point, and a grid of marks each caught at a different phase reads as
   * seven unrelated things rather than one set. @default false
   */
  startAtMark?: boolean;

  /**
   * Bake overrides. `count` defaults to whatever stays legible at `size` —
   * override it only after previewing at the smallest size you ship.
   */
  bake?: BakeOptions;

  /** Per-instance mode tuning, merged over the state's preset. */
  tune?: ModeOpts;

  /** Called once the mark has been baked, or if baking failed. */
  onBake?: (points: LogoPointSet | null, error: Error | null) => void;

  style?: CSSProperties;
}

export function ThinkingLogo({
  logo,
  state = 'thinking',
  size = 64,
  theme = 'auto',
  tint,
  speed = 1,
  paused = false,
  startAtMark = false,
  bake,
  tune,
  onBake,
  style,
  'aria-label': ariaLabel,
  ...rest
}: ThinkingLogoProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dark = useResolvedDark(theme, ref);
  const reduced = useReducedMotion();

  // Dot count is a function of the rendered size, so it is defaulted here
  // rather than in the baker — the baker has no idea how big this will be
  // drawn, and a count tuned for 64px turns a 20px mark into a smudge.
  const style_ = bake?.style ?? 'fill';
  const bakeOpts: BakeOptions = { count: recommendedCount(size, style_), ...bake };
  const { points, error } = useBakedLogo(logo, bakeOpts);

  const onBakeRef = useRef(onBake);
  onBakeRef.current = onBake;
  useEffect(() => {
    if (points || error) onBakeRef.current?.(points, error);
  }, [points, error]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !points) return;
    const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { frame: modeFrame, speed: baseSpeed, opts, binding } = resolveLogo(state, points, tune);
    // The mark is fully assembled one morph after the dwell ends, so that is
    // where a capture should open.
    const dwell = typeof opts.dwell === 'number' ? opts.dwell : 5.5;
    const morph = typeof opts.morph === 'number' ? opts.morph : 1.9;
    const offset = startAtMark ? dwell + morph : 0;
    // Adapted against the resolved substrate, not the raw prop: a brand
    // black has to survive a dark UI, and the correction depends on which
    // theme actually won.
    const parsed = tint ? parseTint(tint) : null;
    const rgb = parsed ? adaptTint(parsed, dark) : null;
    const effSpeed = baseSpeed * speed;

    const render = (tSec: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const f = modeFrame(size, tSec, opts, binding);
      if (rgb) paintFrameTinted(ctx, f, dark, rgb);
      else paintFrame(ctx, f, dark);
    };

    // Reduced motion → one static, deterministic frame, taken where the mark
    // is assembled rather than at a cloud caught mid-flight.
    if (reduced) {
      render(offset || 4.2);
      return;
    }

    let raf = 0;
    let running = false;
    const loop = (stamp: number) => {
      render(tick(stamp) * effSpeed + offset);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || paused) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    render(clockSeconds * effSpeed + offset);

    let visible = true;
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && document.visibilityState !== 'hidden') start();
            else stop();
          })
        : null;
    io?.observe(canvas);
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
      else if (visible) start();
    };
    document.addEventListener('visibilitychange', onVis);
    if (!io) start();

    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [points, state, size, dark, tint, speed, paused, reduced, tune, startAtMark]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={ariaLabel ?? LABELS[state]}
      style={{ width: size, height: size, display: 'block', ...style }}
      {...rest}
    />
  );
}
