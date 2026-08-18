import React, { useEffect, useRef } from 'react';
import { MODE_DRAWS, resolvePreset } from '../../src/index';
import { useResolvedDark } from '../../src/theme';

/**
 * The header's mark: one frame of the engine, drawn once and left alone.
 *
 * The hero used to run the live animation, and with seven of the same
 * animations directly below it the page spent its whole first screen making
 * the same point. A still says what the library is made of — depth carried
 * by dot size and ink weight, nothing else — without competing with the
 * grid for attention.
 *
 * Deterministic on purpose: the time is a constant rather than
 * `performance.now()`, so the mark is identical on every load instead of
 * being whatever frame the clock happened to be on.
 */
export function StaticMark({ size = 104, at = 0.62 }: { size?: number; at?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dark = useResolvedDark('auto', ref);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { mode, opts } = resolvePreset('searching', 64);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    MODE_DRAWS[mode](ctx, size, at, dark, opts);
  }, [size, at, dark]);

  return <canvas ref={ref} role="img" aria-label="thinking-logo" style={{ width: size, height: size, display: 'block' }} />;
}
