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

import {
  siAnthropic,
  siFigma,
  siFramer,
  siGithub,
  siLinear,
  siNike,
  siNotion,
  siShopify,
  siSpotify,
  siStripe,
  siSupabase,
  siVercel
} from 'simple-icons';

export interface Brand {
  key: string;
  title: string;
  /** Path `d` on a 24×24 viewBox — simple-icons' universal format. */
  path: string;
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
 * Ordered so the first row is the easy case and the last is the hard one.
 * A demo that only shows Vercel's triangle is lying by omission — Shopify's
 * bag and Figma's five-shape stack are what most real logos look like.
 */
export const BRANDS: Brand[] = [
  brand(siVercel, 'vercel', 'Thinking', 'simple'),
  brand(siFramer, 'framer', 'Solving', 'simple'),
  brand(siAnthropic, 'anthropic', 'Connecting', 'simple'),
  brand(siSupabase, 'supabase', 'Listening', 'simple'),
  brand(siStripe, 'stripe', 'Solving', 'medium'),
  brand(siLinear, 'linear', 'Thinking', 'medium'),
  brand(siNike, 'nike', 'Weaving', 'medium'),
  brand(siNotion, 'notion', 'Connecting', 'medium'),
  brand(siSpotify, 'spotify', 'Listening', 'medium'),
  brand(siGithub, 'github', 'Searching', 'busy'),
  brand(siShopify, 'shopify', 'Working', 'busy'),
  brand(siFigma, 'figma', 'Breathing', 'busy')
];

export const BRAND_BY_KEY = Object.fromEntries(BRANDS.map((b) => [b.key, b])) as Record<string, Brand>;
