import React from 'react';

const link =
  'text-(--footer-name) no-underline transition-colors duration-150 hover:text-(--footer-name-hover)';

export function Footer() {
  return (
    <footer className="text-[13px] leading-5 text-center pt-12 pb-8 max-w-[560px]">
      <p className="text-(--footer-muted)">
        Built on{' '}
        <a className={link} href="https://github.com/Jakubantalik/thinking-orbs" target="_blank" rel="noopener noreferrer">
          thinking-orbs
        </a>{' '}
        by{' '}
        <a className={link} href="https://www.jakubantalik.com" target="_blank" rel="noopener noreferrer">
          Jakub Antalik
        </a>
        , whose engine does all the hard rendering work here. Logo baking and the logo modes by{' '}
        <a className={link} href="https://github.com/enesozturk" target="_blank" rel="noopener noreferrer">
          Enes Ozturk
        </a>
        . MIT.
      </p>
      <p className="mt-3 text-(--footer-muted) opacity-70">
        Brand marks are shown to illustrate what the library does with artwork you already own. The
        icon paths come from{' '}
        <a className={link} href="https://simpleicons.org" target="_blank" rel="noopener noreferrer">
          simple-icons
        </a>{' '}
        (CC0); every trademark remains its owner&rsquo;s, and none of these companies endorse this
        project.
      </p>
    </footer>
  );
}
