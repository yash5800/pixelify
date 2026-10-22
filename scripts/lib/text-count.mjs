/**
 * Shared text-extraction + word-counting helpers.
 *
 * Used by both the static-HTML audit (scripts/word-count.mjs) and the
 * headless-render audit (scripts/render-word-count.mjs) so both report
 * numbers the same way.
 */

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', eacute: 'é', egrave: 'è', agrave: 'à',
  ccedil: 'ç', uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß',
  times: '×', divide: '÷', middot: '·', bull: '•', deg: '°',
  trade: '™', reg: '®', copy: '©', euro: '€', pound: '£', yen: '¥',
  laquo: '«', raquo: '»', prime: '′', frasl: '⁄', shy: '', zwnj: '', zwj: '',
};

export function decodeEntities(input) {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try { return String.fromCodePoint(code); } catch { return match; }
      }
      return match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

/** Strip everything that is not user-visible prose. */
export function stripToText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|svg|noscript|template|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|hr)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/** Inner HTML of the first <main> element, or null when there is none. */
export function extractMain(html) {
  const start = html.search(/<main\b[^>]*>/i);
  if (start === -1) return null;
  const openTagEnd = html.indexOf('>', start) + 1;
  const end = html.toLowerCase().indexOf('</main>', openTagEnd);
  if (end === -1) return null;
  return html.slice(openTagEnd, end);
}

const CJK_RE = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯ｦ-ﾟ]/g;
const WORD_CHAR_RE = /[\p{L}\p{N}]/u;

/**
 * Count words in plain text.
 * CJK scripts don't separate words with spaces, so each CJK character is
 * counted as one word (the usual convention).
 * Returns { words, cjk, total }.
 */
export function countWords(text) {
  const cleaned = decodeEntities(text).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return { words: 0, cjk: 0, total: 0 };

  const cjk = (cleaned.match(CJK_RE) || []).length;
  const latinOnly = cleaned.replace(CJK_RE, ' ');
  const tokens = latinOnly.split(' ').filter((t) => t.length > 0 && WORD_CHAR_RE.test(t));

  return { words: tokens.length, cjk, total: tokens.length + cjk };
}

/** Count words in a full HTML document and in its <main> subtree. */
export function countHtml(html) {
  const mainHtml = extractMain(html);
  const full = countWords(stripToText(html));
  const main = mainHtml === null ? { words: 0, cjk: 0, total: 0 } : countWords(stripToText(mainHtml));
  return { full, main };
}

/** Group + human label for a route. */
export function classify(route) {
  if (route === '/') return { group: 'Main pages', label: 'Home' };
  if (route === '/404') return { group: 'Main pages', label: '404 Not Found' };
  if (route === '/blogs/') return { group: 'Main pages', label: 'Blog index' };

  const langNames = {
    en: 'English', fr: 'Français', zh: '中文',
    ja: '日本語', hi: 'हिन्दी', ru: 'Русский',
  };

  const blogPost = route.match(/^\/blogs\/([a-z]{2})\/([^/]+)\/$/);
  if (blogPost) {
    const [, lang, slug] = blogPost;
    return {
      group: `Blog posts (${lang})`,
      label: `${langNames[lang] || lang} — ${slug.replace(/_/g, ' ')}`,
    };
  }

  const langIndex = route.match(/^\/blogs\/([a-z]{2})\/$/);
  if (langIndex) {
    return { group: 'Blog indexes', label: `Blog index — ${langNames[langIndex[1]] || langIndex[1]}` };
  }

  // /blogs/<slug>/ — the canonical English article URL (no language segment).
  const enPost = route.match(/^\/blogs\/([^/]+)\/$/);
  if (enPost) {
    const slug = enPost[1];
    return { group: 'Blog posts (en)', label: `English — ${slug.replace(/_/g, ' ')}` };
  }

  const known = {
    '/about/': 'About', '/products/': 'Products', '/privacy/': 'Privacy Policy',
    '/terms/': 'Terms of Service', '/story/': 'Story', '/truckbg/': 'Truck BG',
    '/upscaler/': 'AI Upscaler', '/bg_remove/': 'Background Remover',
  };
  return { group: 'Main pages', label: known[route] || route.replace(/\/$/, '') };
}

export const GROUP_ORDER = [
  'Main pages', 'Blog indexes',
  'Blog posts (en)', 'Blog posts (fr)', 'Blog posts (zh)',
  'Blog posts (ja)', 'Blog posts (hi)', 'Blog posts (ru)',
];

/**
 * What kind of page a route is — decides whether a short word count is a
 * content gap or expected.
 *   article  → pages that should carry copy
 *   listing  → index/listing pages (cards, pagination)
 *   utility  → 404 and noindex playground pages
 */
export function pageKind(route) {
  if (route === '/404') return 'utility';
  if (/^\/blogs\/[a-z]{2}\/$/.test(route) || route === '/blogs/') return 'listing';
  if (/^\/blogs\/[a-z]{2}\/.+\/$/.test(route) || /^\/blogs\/[^/]+\/$/.test(route)) return 'article';
  return 'article';
}

/** Does the document opt out of indexing? */
export function isNoindex(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  if (!m) return false;
  return /noindex/i.test(m[1]);
}

export function sortPages(pages) {
  return pages.sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.group);
    const gb = GROUP_ORDER.indexOf(b.group);
    const ka = ga === -1 ? 99 : ga;
    const kb = gb === -1 ? 99 : gb;
    if (ka !== kb) return ka - kb;
    return b.rendered - a.rendered;
  });
}
