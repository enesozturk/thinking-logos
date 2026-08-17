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

Eight distinct motions on the same mark — not one animation with eight labels. The verbs are the orb states' verbs, so you can run both in one UI and have them mean the same thing.

```tsx
<ThinkingLogo logo={art} state="thinking" />    {/* sphere ⇄ logo — the headline */}
<ThinkingLogo logo={art} state="solving" />     {/* logo → cube → rubik solve → logo */}
<ThinkingLogo logo={art} state="listening" />   {/* logo → a floating body that pulses → logo */}
<ThinkingLogo logo={art} state="connecting" />  {/* wires and packets run across the mark */}
<ThinkingLogo logo={art} state="searching" />   {/* a scan sweeps across the mark */}
<ThinkingLogo logo={art} state="working" />     {/* the mark simmering in place */}
<ThinkingLogo logo={art} state="orbiting" />    {/* the mark's own dots leave, orbit, return */}
<ThinkingLogo logo={art} state="breathing" />   {/* a slow pulse with a halo drifting in depth */}
```

`thinking` is the one to reach for first. The dots churn as a sphere while work is in flight, fold inward paired by angle so the silhouette is readable a third of the way through, and settle face-on.

`solving` and `listening` share a shape: the mark becomes something else, that thing does the work, and the mark comes back. A cube gets solved; a soft body pulses. In both, the logo is the state the animation RETURNS to — never a stage it passes through, and never itself the thing being deformed. While the mark is showing, a single highlight sweeps across it, timed to leave exactly as the next transformation begins.

### The rule every state obeys

**The viewer must always be able to see what the logo is.** A sphere reads correctly from every angle and has no silhouette to protect. A mark has exactly one correct appearance, and everything follows from that:

- **The cycle is one continuous curve, not a sequence of phases.** `thinking` and `solving` both run off a single raised-cosine envelope: the orb sits at its floor, the mark arrives partway up, and the highlight crests at the top. Discrete phases — churn, rise, hold, fall — gave flat plateaus joined by steps, and every one of those joins was a moment where the motion visibly stopped and something else started. Assembly, camera, halo and shimmer are all read off the same variable at different heights, so a transition is always already underway before the last one has finished.
- **`thinking` lands face-on, every cycle.** Rotation advances only while the mark is not assembled, split evenly either side of the window, so the logo itself never turns and the hold falls on a whole revolution. Simply easing the rotation to a stop leaves it at whatever angle it reached — and that angle drifts each cycle, so the mark settles into a slightly different three-quarter view every time.
- **`solving` scrambles a cube, not the logo.** A thin plate sliced and twisted becomes debris within two moves, and the reset then lands on nothing because the viewer stopped tracking a shape long ago. The rotation is confined to the cube — exactly one whole turn — so the mark itself never spins and is only ever shown square to the viewer.
- **`listening` becomes one body, not a chart.** Three attempts, the last two failing in opposite directions. Rolling a wave through the logo by displacing points in depth ghosted the mark across the frame, because a depth offset projects to a screen offset under any camera tilt. Laying the dots out as separate meter bars fixed that but went too literal — a bar chart is a diagram, and the logo shattered into fifteen unrelated pieces. What belongs here is a single wide, slightly irregular volume whose vertical extent swells along its width: the waveform is legible in the silhouette, but it is the silhouette *of something*.
- **`connecting` draws the mark at full strength** and puts the wiring on top. Held back as a ghost, the logo vanished and what remained was an abstract node graph sitting near it.
- **`orbiting` uses the mark's own dots.** A third detach and leave real gaps, drifting within a bounded arc of where they started, then return to the exact seat they left. A shared orbit radius draws a ring, and a ring is a separate object circling the logo rather than the logo coming apart.

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

### Motion is separable from geometry

The insight behind the ten states: an orb state is not a kind of object, it is a motion field that happened to be written against the geometry it generates. `frameRubik` builds a lat/long lattice *and* twists it; `frameWave` builds rings *and* rolls a waveform through them. Split those and the motion is the portable half — a function of position and time that does not care whether the position came from a Fibonacci lattice or a rasterised trademark.

So `solving` calls the *original* solver out of `lattice.ts` rather than reimplementing it. A second copy would drift out of step on the first tuning change, and a product showing an orb and a logo side by side would have two subtly different heartbeats.

## Credits

Built on [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) by [Jakub Antalik](https://www.jakubantalik.com) — the rendering engine, the nine orb states and the depth-through-ink design language are his. This fork adds the bake pipeline and the logo modes. MIT, both.

Demo brand marks come from [simple-icons](https://simpleicons.org) (CC0). Trademarks remain their owners'; none of those companies endorse this project.
