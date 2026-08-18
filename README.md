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

Seven distinct motions on the same mark — not one animation with seven labels. The verbs are the orb states' verbs, so you can run both in one UI and have them mean the same thing.

```tsx
<ThinkingLogo logo={art} state="thinking" />    {/* sphere ⇄ logo — the headline */}
<ThinkingLogo logo={art} state="solving" />     {/* logo → cube → rubik solve → logo */}
<ThinkingLogo logo={art} state="listening" />   {/* logo → a floating body that pulses → logo */}
<ThinkingLogo logo={art} state="searching" />   {/* logo → an even sphere, swept by a meridian → logo */}
<ThinkingLogo logo={art} state="working" />     {/* logo → an armillary of rings, with couriers → logo */}
<ThinkingLogo logo={art} state="orbiting" />    {/* logo → a ringed planet → logo */}
<ThinkingLogo logo={art} state="breathing" />   {/* logo → a bellows of stacked rings → logo */}
```

`thinking` is the one to reach for first. The dots churn as a sphere while work is in flight, fold inward paired by angle so the silhouette is readable a third of the way through, and settle face-on.

All four transforming states share one cycle: the working form dwells and does its work, the mark gathers, breathes once, and dissolves again. Two knobs matter — `dwell`, how long the cube gets to solve or the sphere to be scanned, and `morph`, how long the transformation itself takes in each direction. Full cycle is `dwell + 2 × morph`. Both are sliders in the playground.

### The rule every state obeys

**The viewer must always be able to see what the logo is.** A sphere reads correctly from every angle and has no silhouette to protect. A mark has exactly one correct appearance, and everything follows from that:

- **The mark is punctuation, not a resting state.** Every state spends most of its cycle being something else — an orb, a cube, a globe, a body — and the logo appears briefly at the crest of one smooth arc before dissolving again. A logo that sits on screen for three seconds a cycle stops reading as an event. `dwell` controls how long the working form gets before the mark interrupts it, and is the one timing knob worth reaching for.
- **The mark never simply sits.** It is reached and immediately left: the morph out begins the instant the morph in completes, and nothing in the cycle is flat except the working form's dwell, which is the one pause that is actually wanted. Earlier versions held the logo still, then switched a highlight on as a separate event, then swelled it once on arrival. Every one of those is a join where the motion visibly stops and something else starts.
- **The morph is long and evenly paced.** Pure `easeInOutExpo` was tried, on the theory that a sharp curve reads as deliberate. It does the opposite here: its flat tails mean the morph barely moves for the first and last third — which reads as the pause being designed out — while its violent middle covers most of the distance in a few frames and reads as a snap. Slow *and* stalled. The curve is mostly smootherstep with a measured amount of expo mixed in, and the duration carries the weight: 300 dots crossing the frame need several times the 0.6s a CSS transform on one block would.
- **The mark is always shown face-on.** Rotation belongs to the working form: it runs across the dwell, eases out partway through the morph so the orb is still turning as it starts to become the mark, and does not resume on the way back — a whole turn crammed into a half-second exit reads as frantic and buys nothing from a form that is dissolving anyway. Because the turn count is a whole number, the mark lands on a whole revolution every cycle and the loop closes with no accumulator and no state.
- **Rotation cruises rather than swings.** A smootherstep across a long dwell puts all the speed in the middle, so the orb surges and slows for no reason. The ramps are shaped and the middle is linear.
- **`solving` scrambles a cube, not the logo.** A thin plate sliced and twisted becomes debris within two moves, and the reset then lands on nothing because the viewer stopped tracking a shape long ago. The rotation is confined to the cube — exactly one whole turn — so the mark itself never spins and is only ever shown square to the viewer.
- **`searching` is carried by the sweep, not by the construction.** It was drawn as a wireframe of meridians and parallels, which said globe the way every stock icon says it and packed the dots into lines that bunch at the poles. The dots are now on the Fibonacci lattice — the closest thing to equal spacing on a sphere, with no seams and no poles — and a meridian of longitude travels round it with everything behind held back. An even field lit by a moving line reads as a surface being examined; a drawn grid just reads as a picture of a globe. It shares its lattice with `thinking`'s orb and stays entirely distinct, because the difference between those two was never geometry.
- **`listening` becomes one body, not a chart.** Three attempts, the last two failing in opposite directions. Rolling a wave through the logo by displacing points in depth ghosted the mark across the frame, because a depth offset projects to a screen offset under any camera tilt. Laying the dots out as separate meter bars fixed that but went too literal — a bar chart is a diagram, and the logo shattered into fifteen unrelated pieces. What belongs here is a single wide, slightly irregular volume whose vertical extent swells along its width: the waveform is legible in the silhouette, but it is the silhouette *of something*.
- **Subtlety does not survive being made small.** `working` used to jitter every dot on a noise field and `breathing` pulsed the mark a few percent in place. Both are pleasant at 140px and completely invisible at 24, which is where a loading indicator actually ships. What survives is contrast and silhouette, not displacement — so `working` becomes an armillary of rings with bright couriers crossing it, and `breathing` becomes a body whose own outline moves.
- **`working` is a torus, the only form here that is not a variation on a ball.** Rings were tried first — seven great circles of a sphere — and never settled into one object: Fibonacci-spread inclinations give seven planes that each look right alone and read as a tangle together. A torus is one closed surface with a hole that announces its orientation from any angle, and turning about its own axis it reads as a wheel doing work. Its dots are placed by area, not by parameter, since a torus has more surface on its rim than in its throat and uniform steps pile them into the hole.
- **`orbiting` needs a body at the centre.** It used to have the mark's own dots wander around its edges, which was a nice detail and not an orbit — nothing was going round anything. A planet supplies the thing being orbited, and every ring particle shares one angular rate, which is what makes the motion read as governed rather than as drift.
- **`breathing` moves height and radius in opposite directions.** A body that simply grows and shrinks reads as a beating heart; drawing tall and narrow, then settling short and wide, keeps the volume roughly constant and reads as drawing air. It is stacked rings rather than a ball because an earlier version shared its entire silhouette with `thinking`'s orb — different motions on the same shape is, at a glance, one state twice.

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
