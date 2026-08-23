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
 * A single origin shared by every instance that asks to start on the mark.
 *
 * Taken on first use rather than at module load: the bundle is evaluated
 * long before anything mounts, and an epoch set there would already be
 * seconds old by the time the first canvas paints. Mount times differ by
 * well under a frame, so one origin keeps the whole page in step.
 */
let markEpoch: number | null = null;

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
    const dwell = typeof opts.dwell === 'number' ? opts.dwell : 4;
    const morph = typeof opts.morph === 'number' ? opts.morph : 1.9;
    const offset = startAtMark ? dwell + morph : 0;
    if (startAtMark) markEpoch ??= performance.now();
    const origin = startAtMark ? (markEpoch as number) : 0;
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

    const clock = () => ((performance.now() - origin) / 1000) * effSpeed + offset;

    let raf = 0;
    let running = false;
    const loop = () => {
      render(clock());
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

    render(clock());

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
