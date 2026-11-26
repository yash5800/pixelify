import { SITE_LANGUAGES } from '@/lib/i18n';

export const SITE_URL = 'https://pixelify.me';
export const SITE_NAME = 'Pixelify';

/**
 * Canonical in-app URL for a path in a given language.
 * English is served from the unprefixed routes, so `/en/...` aliases
 * canonicalize back to `/...`.
 */
export function localizedHref(lang: string, path: string): string {
  if (!lang || lang === 'en') return path;
  return path === '/' ? `/${lang}/` : `/${lang}${path}`;
}

/** hreflang map for a path across every supported language. */
export function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries(
    SITE_LANGUAGES.map(({ code }) => [code, localizedHref(code, path)])
  );
}

/** Canonical blog index for a language. The `/blog/<lang>/` family wins. */
export function blogIndexHref(lang: string): string {
  return lang === 'en' ? '/blog/' : `/blog/${lang}/`;
}

/** hreflang map for the blog index across every supported language. */
export function blogIndexAlternates(): Record<string, string> {
  return Object.fromEntries(
    SITE_LANGUAGES.map(({ code }) => [code, blogIndexHref(code)])
  );
}
