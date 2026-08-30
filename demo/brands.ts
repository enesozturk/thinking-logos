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

import claudeMark from './marks/claude.svg?raw';
import falMark from './marks/fal.svg?raw';
import xMark from './marks/x.svg?raw';
import type { LogoState } from '../src/logoPresets';
import {
  BODY_CRYSTAL,
  BODY_GALAXY,
  BODY_LATTICE,
  BODY_TORUS,
  BODY_YARN
} from '../src/engine/logoGenerate';
import {
  siClaude,
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
  /**
   * Show one verb several ways instead of showing every verb once.
   *
   * The seven-state grid is the right page for a brand whose product does
   * all seven things. For a brand that does one — Fal generates, and does
   * not listen or wait — six of the seven cards are answering a question
   * nobody asked about it. Such a brand gets the variants of its own verb
   * instead, which is the comparison actually worth making.
   */
  variants?: {
    state: LogoState;
    /** One entry per card; each is merged over the state's preset. */
    tunes: Record<string, number>[];
  };
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
  // Supplied as full markup rather than a simple-icons path — it is the
  // brand's own asset, and `svg` exists precisely so a caller is never
  // forced to reduce their mark to one path to use this.
  { ...brand(siClaude, 'claude', 'Thinking', 'medium'), svg: claudeMark },
  { ...brand(siX, 'x', 'Working', 'simple'), svg: xMark },
  brand(siSupabase, 'supabase', 'Waiting', 'simple'),
  brand(siLinear, 'linear', 'Searching', 'medium'),
  brand(siSpotify, 'spotify', 'Listening', 'medium'),
  brand(siGithub, 'github', 'Solving', 'busy'),
  // No simple-icons entry, so the whole record is written out. `path` is
  // empty because `svg` takes precedence — a caller with real artwork
  // should never have to reduce it to a single path first.
  {
    key: 'fal',
    title: 'Fal',
    path: '',
    hex: 'EC0648',
    verb: 'Generating',
    weight: 'simple',
    svg: falMark,
    // Fal runs inference. It generates; it does not listen or wait, so its
    // page shows the five things generating can look like rather than seven
    // verbs, six of which would be about some other product.
    variants: {
      state: 'generating',
      tunes: [
        { body: BODY_CRYSTAL },
        { body: BODY_TORUS },
        { body: BODY_LATTICE },
        { body: BODY_YARN },
        { body: BODY_GALAXY }
      ]
    }
  }
];

export const BRAND_BY_KEY = Object.fromEntries(BRANDS.map((b) => [b.key, b])) as Record<string, Brand>;
