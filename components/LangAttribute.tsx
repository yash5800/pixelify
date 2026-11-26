'use client';

import { useEffect } from 'react';

/**
 * The root layout hard-codes <html lang="en">. Localized routes update the
 * document language after hydration so assistive tech and search engines see
 * the correct locale for the page.
 */
export default function LangAttribute({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);

  return null;
}
