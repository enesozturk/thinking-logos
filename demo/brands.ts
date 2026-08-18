// Demo marks, pulled from simple-icons rather than redrawn by hand.
//
// Two reasons. Accuracy: these are the real paths, so what the demo shows
// is what a brand's actual asset bakes to, not a lookalike that quietly
// flatters the sampler. And provenance: the simple-icons icon files are
// CC0, so the demo is not shipping traced copies of anyone's artwork.
//
// The trademarks themselves remain their owners' — these appear here purely
// to illustrate what the library does with a mark you already have, which
// is also why the set spans the full difficulty range rather than only the
// logos that happen to bake well.

import xMark from './marks/x.svg?raw';
import {
  siAnthropic,
  siGithub,
  siLinear,
  siSpotify,
  siX,
  siSupabase
} from 'simple-icons';

export interface Brand {
  key: string;
  title: string;
  /** Path `d` on a 24×24 viewBox — simple-icons' universal format. */
  path: string;
  /**
   * Full SVG markup, when the mark is not a single glyph. Takes precedence
   * over `path`: a wordmark is several paths on its own viewBox, and there
   * is no honest way to squeeze that into simple-icons' one-path format.
   */
  svg?: string;
  /** Brand colour, without the leading `#`. */
  hex: string;
  /** The verb this card shows, so the grid reads as a set of real states. */
  verb: string;
  /** Roughly how much detail the mark carries, for the legibility note. */
  weight: 'simple' | 'medium' | 'busy';
}

function brand(
  icon: { title: string; path: string; hex: string },
  key: string,
  verb: string,
  weight: Brand['weight']
): Brand {
  return { key, title: icon.title, path: icon.path, hex: icon.hex, verb, weight };
}

/**
 * One mark per state — no verb appears twice, and the set is exactly as
 * long as the list of states.
 *
 * The grid's job is to show that these are distinct MOTIONS, and a set with
 * three cards all saying "thinking" spends its slots proving the opposite.
 * Ordered easy to hard as well: a demo made only of simple marks is lying
 * by omission, since Shopify's bag is what most real logos look like.
 */
export const BRANDS: Brand[] = [
  brand(siAnthropic, 'anthropic', 'Thinking', 'simple'),
  brand(siSupabase, 'supabase', 'Solving', 'simple'),
  // Supplied as full markup rather than a simple-icons path — it is the
  // brand's own asset, and `svg` exists precisely so a caller is never
  // forced to reduce their mark to one path to use this.
  { ...brand(siX, 'x', 'Orbiting', 'simple'), svg: xMark },
  brand(siLinear, 'linear', 'Listening', 'medium'),
  brand(siSpotify, 'spotify', 'Searching', 'medium'),
  brand(siGithub, 'github', 'Breathing', 'busy')
];

export const BRAND_BY_KEY = Object.fromEntries(BRANDS.map((b) => [b.key, b])) as Record<string, Brand>;
