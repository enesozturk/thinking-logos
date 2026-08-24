/// <reference lib="webworker" />

/**
 * Syntax highlighting, off the main thread.
 *
 * Shiki tokenising the generated component takes about 2.4 seconds — most of
 * it spent on the baked point array, which is ten thousand numeric tokens on
 * one line. On the main thread that is 2.4s of frozen page: the animations
 * stop dead, and because their clock is wall-clock they then jump forward by
 * however long the stall lasted.
 *
 * A worker makes the cost invisible. It is the same work; it simply is not
 * happening where the frames are.
 */
import type { HighlighterCore } from 'shiki/core';

let pending: Promise<HighlighterCore> | null = null;

function highlighter(): Promise<HighlighterCore> {
  pending ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript')
    ]);
    return createHighlighterCore({
      langs: [import('shiki/langs/tsx.mjs')],
      themes: [
        import('shiki/themes/github-dark-default.mjs'),
        import('shiki/themes/github-light-default.mjs')
      ],
      engine: createJavaScriptRegexEngine()
    });
  })();
  return pending;
}

export interface HighlightRequest {
  id: number;
  code: string;
  lang: string;
}

export interface HighlightResponse {
  id: number;
  html?: string;
  error?: string;
}

self.onmessage = async (e: MessageEvent<HighlightRequest>) => {
  const { id, code, lang } = e.data;
  try {
    const h = await highlighter();
    const html = h.codeToHtml(code, {
      lang,
      // Both themes in one pass. Shiki emits one palette inline and the other
      // as CSS variables, so switching theme is a class change on the page
      // rather than another trip through here.
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      defaultColor: false
    });
    (self as unknown as Worker).postMessage({ id, html } satisfies HighlightResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : String(err)
    } satisfies HighlightResponse);
  }
};
