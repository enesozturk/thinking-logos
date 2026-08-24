import React, { useEffect, useRef, useState } from 'react';
import type { HighlightResponse } from '../lib/highlight.worker';
import { CopyButton } from './CopyButton';

/**
 * A code block that is never worth freezing the page for.
 *
 * Highlighting runs in a worker (see highlight.worker.ts for why), and until
 * it answers the same code is shown unhighlighted. That ordering is the
 * point: the text is readable and copyable from the first frame, and colour
 * arrives when it arrives.
 *
 * Requests carry an id and stale answers are dropped, so clicking through
 * states quickly always lands on the highlight for the state you stopped on
 * rather than whichever job happened to finish last.
 */
let worker: Worker | null = null;
let nextId = 1;

function ensureWorker(): Worker {
  worker ??= new Worker(new URL('../lib/highlight.worker.ts', import.meta.url), {
    type: 'module'
  });
  return worker;
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
  const latest = useRef(0);

  useEffect(() => {
    const id = nextId++;
    latest.current = id;
    // Drop the previous colouring rather than leave it under new text.
    setHtml(null);

    const w = ensureWorker();
    const onMessage = (e: MessageEvent<HighlightResponse>) => {
      if (e.data.id !== latest.current || !e.data.html) return;
      setHtml(e.data.html);
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ id, code, lang });
    return () => w.removeEventListener('message', onMessage);
  }, [code, lang]);

  return (
    <figure
      className={`relative overflow-hidden rounded-lg border bg-card ${className ?? ''}`}
      data-slot="code-block"
    >
      <div
        className="shiki-host overflow-auto text-[13px] leading-[1.6]"
        style={maxHeight ? { maxHeight } : undefined}
        // Markup from Shiki, generated in a worker from a string this app
        // produced. Nothing user-supplied reaches it.
        dangerouslySetInnerHTML={html ? { __html: html } : undefined}
      >
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
