import React, { useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki/core';
import { CopyButton } from './CopyButton';

/**
 * Syntax highlighting, loaded once and shared.
 *
 * Only the tsx grammar and the two GitHub themes are pulled in — the full
 * Shiki bundle carries every language it knows, which is a few megabytes to
 * ship for a page that highlights one file in one language. The JavaScript
 * regex engine avoids the Oniguruma wasm blob on top of that.
 *
 * The highlighter is created lazily and memoised on the module, so the cost
 * lands after first paint and is paid once no matter how many blocks the
 * page has.
 */
let pending: Promise<HighlighterCore> | null = null;
function highlighter(): Promise<HighlighterCore> {
  // Everything is imported dynamically, including Shiki's own core. A static
  // import puts the whole highlighter in the entry chunk, where it delays the
  // first paint of a page whose point is an animation.
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

export function CodeBlock({
  code,
  lang = 'tsx',
  className,
  maxHeight
}: {
  code: string;
  lang?: string;
  className?: string;
  maxHeight?: number;
}) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void highlighter().then((h) => {
      if (!live) return;
      setHtml(
        h.codeToHtml(code, {
          lang,
          // Both themes in one pass. Shiki emits the light colours inline and
          // the dark ones as CSS variables, so switching theme is a class
          // change rather than a re-highlight.
          themes: { light: 'github-light-default', dark: 'github-dark-default' },
          defaultColor: false
        })
      );
    });
    return () => {
      live = false;
    };
  }, [code, lang]);

  return (
    <figure
      className={`relative overflow-hidden rounded-lg border bg-card ${className ?? ''}`}
      data-slot="code-block"
    >
      <div
        className="shiki-host overflow-auto text-[13px] leading-[1.6]"
        style={maxHeight ? { maxHeight } : undefined}
        // Highlighted markup from Shiki, generated in this file from a
        // string this app produced. Nothing user-supplied reaches it.
        dangerouslySetInnerHTML={html ? { __html: html } : undefined}
      >
        {/* Unhighlighted until the grammar lands, so the code is readable
            from the first frame rather than blank. */}
        {html ? undefined : (
          <pre className="p-4 font-mono whitespace-pre">
            <code>{code}</code>
          </pre>
        )}
      </div>
      <CopyButton className="absolute top-2 right-2" getText={() => code} />
    </figure>
  );
}
