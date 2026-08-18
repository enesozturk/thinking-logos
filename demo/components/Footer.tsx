import React from 'react';

const link = 'text-foreground/70 underline-offset-4 hover:text-foreground hover:underline';

export function Footer() {
  return (
    <footer className="max-w-[560px] pt-12 pb-8 text-center text-[13px] leading-5 text-muted-foreground">
      <p>
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
      <p className="mt-3 opacity-80">
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
