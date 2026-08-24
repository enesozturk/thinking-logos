// Step 1 of the bake: any vector artwork → a plain alpha mask.
//
// We rasterise rather than parse. A logo in the wild is not one tidy path:
// it is compound paths with holes, even-odd and nonzero fills mixed, open
// strokes with caps and joins, clip paths, and text that was never
// converted to outlines. Writing a parser that handles all of it is a
// year of work that the browser already did. So we hand the artwork to
// the renderer, read the pixels back, and every downstream step operates
// on one uniform representation.
//
// Everything after this file is pure arithmetic over `AlphaMask`, which is
// why the samplers, the distance transform and the shell projection all
// run identically on an uploaded SVG, a simple-icons path, or a PNG.

/** A greyscale coverage buffer, row-major, alpha in [0, 1]. */
export interface AlphaMask {
  w: number;
  h: number;
  a: Float32Array;
}

/** Read coverage at integer pixel coords; out of bounds reads as empty. */
export function maskAt(m: AlphaMask, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 0;
  return m.a[y * m.w + x];
}

/** Coverage test against a threshold — the single definition of "inside". */
export function isInk(m: AlphaMask, x: number, y: number, thr: number): boolean {
  return maskAt(m, x, y) >= thr;
}

/**
 * Bilinear coverage at fractional coords. The Poisson sampler tests
 * candidate points that never land on pixel centres, and snapping them to
 * integers would quantise the silhouette edge to the raster grid — visible
 * as a stair-stepped outline once the dots are only a few pixels apart.
 */
export function maskAtF(m: AlphaMask, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = maskAt(m, x0, y0);
  const b = maskAt(m, x0 + 1, y0);
  const c = maskAt(m, x0, y0 + 1);
  const d = maskAt(m, x0 + 1, y0 + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function canvas2d(w: number, h: number): { ctx: CanvasRenderingContext2D; el: HTMLCanvasElement } {
  if (typeof document === 'undefined') {
    throw new Error('thinking-logos: bake requires a DOM. Bake once in the browser, then ship the serialised point set.');
  }
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('thinking-logos: could not acquire a 2D context');
  return { ctx, el };
}

function readMask(ctx: CanvasRenderingContext2D, w: number, h: number): AlphaMask {
  const px = ctx.getImageData(0, 0, w, h).data;
  const a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] / 255;
  return { w, h, a };
}

/**
 * Crop to the artwork's bounding box, then re-letterbox into a square with
 * a fixed margin.
 *
 * This is what makes different logos land at the same visual weight. Source
 * SVGs disagree wildly about padding — some marks fill their viewBox edge to
 * edge, others float in 40% whitespace. Normalising here means a caller's
 * `size` prop means the same thing for every logo, instead of silently
 * inheriting whatever the designer's export settings were.
 */
export function trimAndCenter(m: AlphaMask, out: number, margin: number, thr: number): AlphaMask {
  let minX = m.w;
  let minY = m.h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.a[y * m.w + x] < thr) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { w: out, h: out, a: new Float32Array(out * out) };

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const inner = out * (1 - 2 * margin);
  const scale = inner / Math.max(bw, bh);
  const dw = bw * scale;
  const dh = bh * scale;
  const ox = (out - dw) / 2;
  const oy = (out - dh) / 2;

  const { ctx } = canvas2d(out, out);
  const src = canvas2d(m.w, m.h);
  const img = src.ctx.createImageData(m.w, m.h);
  for (let i = 0; i < m.a.length; i++) {
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = Math.round(m.a[i] * 255);
  }
  src.ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.el, minX, minY, bw, bh, ox, oy, dw, dh);
  return readMask(ctx, out, out);
}

/**
 * Rasterise SVG markup by round-tripping it through an `<img>`.
 *
 * The width/height attributes are forced to the raster resolution and a
 * viewBox is synthesised when missing, because an SVG without intrinsic
 * dimensions renders at an implementation-defined default size (300×150 in
 * most engines) and would otherwise bake at the wrong aspect ratio.
 *
 * Note this path is deliberately sandboxed by the browser: an `<img>` does
 * not run scripts or fetch external references, so baking an SVG a user
 * uploaded cannot execute anything.
 */
export async function rasterizeSvg(svgText: string, res: number): Promise<AlphaMask> {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName !== 'svg' || doc.querySelector('parsererror')) {
    throw new Error('thinking-logos: input is not valid SVG markup');
  }
  if (!svg.getAttribute('viewBox')) {
    const w = Number.parseFloat(svg.getAttribute('width') || '0');
    const h = Number.parseFloat(svg.getAttribute('height') || '0');
    if (w > 0 && h > 0) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svg.setAttribute('width', String(res));
  svg.setAttribute('height', String(res));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const serialized = new XMLSerializer().serializeToString(svg);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  const img = new Image();
  img.decoding = 'sync';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('thinking-logos: the browser could not render this SVG'));
    img.src = url;
  });

  const { ctx } = canvas2d(res, res);
  ctx.drawImage(img, 0, 0, res, res);
  return readMask(ctx, res, res);
}

/**
 * Rasterise a bare path `d` string — the shape most icon sets ship (a
 * single path on a square viewBox). Synchronous, since `Path2D` needs no
 * image decode.
 */
export function rasterizePath(d: string, viewBox: number, res: number): AlphaMask {
  const { ctx } = canvas2d(res, res);
  const s = res / viewBox;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(d));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return readMask(ctx, res, res);
}

/** Rasterise an already-decoded bitmap (drag-and-dropped PNG logos). */
export function rasterizeImage(img: CanvasImageSource, res: number): AlphaMask {
  const { ctx } = canvas2d(res, res);
  ctx.drawImage(img, 0, 0, res, res);
  return readMask(ctx, res, res);
}
