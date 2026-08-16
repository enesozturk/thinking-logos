# thinking-logo

Your logo as the loading state. Bake any SVG into a 3D point cloud and animate it with the [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) engine — the mark scatters into a sphere while the model works, and reassembles into your brand when it lands.

Plain 2D canvas. No WebGL, no filters, no runtime dependency beyond React.

[Live demo](https://enesozturk.github.io/thinking-logo/) · [Report an issue](https://github.com/enesozturk/thinking-logo/issues)

```bash
npm install thinking-logo
```

```tsx
import { ThinkingLogo } from 'thinking-logo';

<ThinkingLogo logo={{ svg: mySvg }} state="thinking" size={64} />;
```

## Why

Every AI product now ships the same shimmering orb. A loading state is one of the few moments where a user is doing nothing but looking at your app — spending it on a generic spinner is a wasted impression. This turns that moment into your mark.

It is a superset of thinking-orbs: all nine procedural orb states are still exported and unchanged, so `ThinkingOrb` remains a drop-in and you can move to `ThinkingLogo` when you have artwork ready.

## States

Five verbs, deliberately named to mirror the orb states.

```tsx
<ThinkingLogo logo={art} state="thinking" />   {/* sphere ⇄ logo — the headline */}
<ThinkingLogo logo={art} state="idle" />       {/* the mark turning gently in space */}
<ThinkingLogo logo={art} state="searching" />  {/* a scan sweeps across the mark */}
<ThinkingLogo logo={art} state="working" />    {/* the mark simmering in place */}
<ThinkingLogo logo={art} state="orbiting" />   {/* particles circling the mark */}
```

`thinking` is the one to reach for first. It runs a cycle: the dots churn as a sphere while work is in flight, fold inward, and settle face-on into your logo — the spin easing to a genuine stop rather than freezing mid-turn.

## Baking

A bake turns artwork into points. It is the only part that needs a DOM, and it happens once.

```tsx
// From SVG markup
<ThinkingLogo logo={{ svg: mySvgString }} />

// From a bare path `d` (what most icon sets ship)
<ThinkingLogo logo={{ path: 'M13.976 9.15...', viewBox: 24 }} />

// From a decoded bitmap
<ThinkingLogo logo={{ image: myImageBitmap }} />
```

| Option       | Default  | What it does                                                            |
| ------------ | -------- | ----------------------------------------------------------------------- |
| `count`      | by size  | Target dot count. The one knob that governs legibility.                  |
| `style`      | `fill`   | `fill` covers the mark, `outline` traces its silhouette, `both` does each. |
| `shell`      | `dome`   | `flat`, `dome` (inflated), or `slab` (extruded with a side wall).         |
| `depth`      | `0.34`   | Shell height, in unit-sphere units.                                      |
| `resolution` | `256`    | Raster size for the bake. Higher = finer edges, slower.                  |
| `threshold`  | `0.5`    | Coverage at which a pixel counts as ink.                                 |
| `margin`     | `0.06`   | Empty frame around the mark, so every logo lands at the same weight.     |
| `seed`       | `1`      | Blue-noise seed. Same seed, same bytes.                                  |

```tsx
<ThinkingLogo logo={{ svg }} bake={{ style: 'outline', shell: 'slab', count: 220 }} />
```

### Bake once, ship JSON

The runtime path above rasterises in the browser on first mount. For production, do it at build time and ship the result — then no rasteriser, no `<img>` decode, and no work on the user's main thread.

```ts
// build script
import { bakeLogo, serializeLogo } from 'thinking-logo/bake';

const set = await bakeLogo({ svg }, { count: 300, shell: 'dome' });
writeFileSync('logo.json', serializeLogo(set));
```

```tsx
// app
import { deserializeLogo } from 'thinking-logo';
import points from './logo.json';

<ThinkingLogo logo={deserializeLogo(points)} state="thinking" />;
```

A point set is plain JSON — commit it, diff it, and hand it to a platform that has no SVG renderer at all.

## Brand colour

```tsx
<ThinkingLogo logo={art} tint="#635BFF" />
```

Tinting replaces the hue only. Depth in this engine *is* the ink value, so a flat brand fill would collapse the mark into a toneless silhouette; instead the ramp runs from the substrate to your colour and every dot keeps its place on it.

Brand blacks are handled: a great many marks are specified as pure black (Vercel, Notion, Nike, GitHub), and painting those on a dark UI would render nothing. The tint is lightened just far enough to survive, hue intact.

## What this cannot do

Worth knowing before you commit to it.

- **Detail does not survive.** At 20px there is room for a few dozen dots. A wordmark, a gradient, or a five-shape composite will read as a smudge. Simple, bold, single-colour marks work; the demo's bottom row shows what busy ones look like, on purpose.
- **It is a silhouette, not a picture.** Multi-colour artwork bakes as one shape. Interior colour boundaries disappear.
- **Thin marks hit a floor.** If you ask for 600 dots and get 300, the shape had nowhere to put the rest. That is the artwork talking, not a failed bake.

Preview at the smallest size you actually ship, and judge it there.

## How it works

Two halves, split on a hard line.

**Bake** (`thinking-logo/bake`) — DOM allowed, runs once. Rasterise the artwork to an alpha mask, because the browser already solved compound paths, even-odd fills, strokes and unconverted text. Then trace contours with marching squares for the outline styles, blue-noise fill the interior with Poisson-disk for the fill styles, and lift the flat result into 3D via a distance transform. Out comes a flat `Float32Array`.

**Engine** (`thinking-logo/engine`) — no DOM, no closures, `Math` only. Frame functions take `(size, t, opts, logo)` and return a finished, z-sorted list of circles. The same discipline as the orb modes, which is what lets the React Native and SwiftUI ports consume this output verbatim and be diffed numerically against the web.

Nothing in the engine knows what an SVG is.

## Credits

Built on [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) by [Jakub Antalik](https://www.jakubantalik.com) — the rendering engine, the nine orb states and the depth-through-ink design language are his. This fork adds the bake pipeline and the logo modes. MIT, both.

Demo brand marks come from [simple-icons](https://simpleicons.org) (CC0). Trademarks remain their owners'; none of those companies endorse this project.
