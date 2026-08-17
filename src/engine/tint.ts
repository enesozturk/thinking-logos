// Optional brand colour, applied at paint time only.
//
// The engine's depth cue IS the ink value — a dot's greyness is how far
// away it reads. Painting each dot in a flat brand colour destroys that,
// and the mark collapses into a single-tone silhouette with no volume. So
// tinting keeps the computed ink value as the *weight* and only replaces
// the hue: the ramp runs from the substrate colour to the brand colour, and
// every dot keeps its position on that ramp.
//
// This lives in the painter, never in the geometry, so a tinted logo and an
// untinted one produce identical frames — which is what keeps the native
// ports and the golden vectors comparing numbers rather than colours.

import type { OrbFrame } from './core';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `#rgb`, `#rrggbb`, or `r,g,b`. Returns null on anything else. */
export function parseTint(value: string): Rgb | null {
  const s = value.trim();
  const hex = s.startsWith('#') ? s.slice(1) : null;
  if (hex && (hex.length === 3 || hex.length === 6)) {
    const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
    const n = Number.parseInt(full, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const parts = s.split(',').map((p) => Number.parseInt(p, 10));
  if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return null;
}

/** Relative luminance in [0, 1], sRGB weights, no gamma — good enough here. */
function luminance(c: Rgb): number {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

/**
 * Pull a brand colour far enough off the substrate to survive.
 *
 * This is not a nicety. A large share of real logos are specified as pure
 * black — Vercel, Notion, Nike, GitHub, Next.js all are — and painting
 * black dots on a dark UI renders an invisible component. Refusing to tint
 * is worse (the brand colour silently does nothing); overriding the hue is
 * worse still. Mixing toward the substrate's opposite keeps the hue and
 * only moves lightness, which is what a designer would do by hand when
 * putting the same mark on a dark background.
 *
 * The thresholds are deliberately loose: this should rescue black-on-black,
 * not restyle a brand that is already legible.
 */
export function adaptTint(tint: Rgb, dark: boolean): Rgb {
  const l = luminance(tint);
  if (dark && l < 0.42) {
    const f = (0.42 - l) / (1 - l);
    return {
      r: Math.round(tint.r + (255 - tint.r) * f),
      g: Math.round(tint.g + (255 - tint.g) * f),
      b: Math.round(tint.b + (255 - tint.b) * f)
    };
  }
  if (!dark && l > 0.62) {
    const f = (l - 0.62) / l;
    return {
      r: Math.round(tint.r * (1 - f)),
      g: Math.round(tint.g * (1 - f)),
      b: Math.round(tint.b * (1 - f))
    };
  }
  return tint;
}

/**
 * Ramp one ink value to a colour.
 *
 * `v` is the already-substrate-corrected level: 1 is a near dot at full
 * presence, 0 is a far dot that should recede into the background. On a
 * dark substrate that means scaling the tint down toward black; on a light
 * one, washing it out toward white. Same ramp, mirrored — the identical
 * relationship the greyscale painter has.
 */
function ramp(tint: Rgb, v: number, dark: boolean, k = 1): string {
  // The neutral end of the blend is the greyscale painter's own output, so
  // k = 0 renders exactly what an untinted page would show.
  const g = 255 * v;
  const mix = (c: number) => {
    const col = dark ? c * v : 255 + (c - 255) * (1 - v);
    const grey = dark ? g : 255 - (255 - g);
    return Math.round(grey + (col - grey) * k);
  };
  return `${mix(tint.r)},${mix(tint.g)},${mix(tint.b)}`;
}

/** Paint a finished frame in a brand colour. Lines first, as usual. */
export function paintFrameTinted(
  ctx: CanvasRenderingContext2D,
  frame: OrbFrame,
  dark: boolean,
  tint: Rgb
): void {
  for (const l of frame.lines) {
    const w = Math.min(1, Math.max(0, l.white));
    ctx.strokeStyle = `rgba(${ramp(tint, dark ? 1 - w : w, dark)},${l.a ?? 1})`;
    ctx.lineWidth = l.w;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  }
  for (const d of frame.dots) {
    const w = Math.min(1, Math.max(0, d.white));
    ctx.fillStyle = `rgba(${ramp(tint, dark ? 1 - w : w, dark, d.k ?? 1)},${d.a ?? 1})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
