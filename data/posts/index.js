/**
 * Blog post registry — the single place to manage all posts.
 *
 * Post content lives in one file per language:
 *   ./posts_en.js, ./posts_fr.js, ./posts_zh.js,
 *   ./posts_ja.js, ./posts_hi.js, ./posts_ru.js
 *
 * Every language ships the SAME slugs (a translation keeps its source
 * slug), so each post is tagged with a `lang` and non-English articles
 * are addressed through a language segment: /blogs/fr/<slug>.
 * English keeps the original /blogs/<slug> URLs.
 *
 * TO ADD A NEW POST:
 *   1. Append a {slug, title, description, tags, date, author, cover,
 *      coverAlt, blocks} object to the post list(s) in ./posts_*.js.
 *      The SAME slug must be used in every language that has a translation
 *      (skip languages you don't translate — they simply won't show it).
 *   2. To add a NEW LANGUAGE, import its file below, register it in
 *      LANGUAGES and in SOURCES. That's it — list page, pagination,
 *      search, language filter, related-posts and the article route all
 *      pick it up automatically.
 *
 * Post shape:
 *   {
 *     slug: 'name_uuid',          // URL: /blogs/<slug> (en) | /blogs/<lang>/<slug>
 *     lang: 'en',                 // added by this registry (not in the data files)
 *     title: 'Article title',
 *     description: 'Card + meta description',
 *     tags: ['Tag', ...],
 *     date: 'YYYY-MM-DD',         // drives sorting
 *     author: 'Name',
 *     cover: '/blogs/image.jpg',  // card + hero image
 *     coverAlt: 'Alt text',
 *     blocks: [...],
 *   }
 */

import { POSTS_EN } from './posts_en';
import { POSTS_FR } from './posts_fr';
import { POSTS_ZH } from './posts_zh';
import { POSTS_JA } from './posts_ja';
import { POSTS_HI } from './posts_hi';
import { POSTS_RU } from './posts_ru';

/** Supported UI languages, in display order. `code` is the URL segment. */
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'zh', label: '中文', short: 'ZH' },
  { code: 'ja', label: '日本語', short: 'JA' },
  { code: 'hi', label: 'हिन्दी', short: 'HI' },
  { code: 'ru', label: 'Русский', short: 'RU' },
];

export const DEFAULT_LANG = 'en';

const SOURCES = {
  en: POSTS_EN,
  fr: POSTS_FR,
  zh: POSTS_ZH,
  ja: POSTS_JA,
  hi: POSTS_HI,
  ru: POSTS_RU,
};

export function isSupportedLang(code) {
  return LANGUAGES.some((l) => l.code === code);
}

/** Short uppercase badge for a language code ('fr' → 'FR'). */
export function langShort(code) {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? found.short : String(code || '').toUpperCase();
}

/** Human label for a language code ('fr' → 'Français'). */
export function langLabel(code) {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? found.label : String(code || '');
}

/** Newest-first ordering (date, then title for stability). */
function newestFirst(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.title.localeCompare(b.title);
}

/** Every post, tagged with its language, bucketed per language. */
const POSTS_BY_LANG = Object.fromEntries(
  LANGUAGES.map(({ code }) => [
    code,
    (SOURCES[code] || []).map((post) => ({ ...post, lang: code })).sort(newestFirst),
  ])
);

/**
 * The mixed feed.
 *
 * Every language ships the same slugs in the same date order, so
 * round-robining ACROSS LANGUAGES (en, fr, zh, ja, hi, ru, en, …) lands all
 * six translations of one article on the same page — the grid fills up with
 * the same post repeated in different languages.
 *
 * Round-robin across SLUGS instead: each round emits every article exactly
 * once, and the language slot is shifted by the article's index so
 * consecutive cards differ in both article and language. A translation is
 * then a full round away from its sibling instead of sitting next to it.
 */
const MIXED = (() => {
  const groups = [];
  const groupIndex = new Map();
  for (const { code } of LANGUAGES) {
    for (const post of POSTS_BY_LANG[code]) {
      let index = groupIndex.get(post.slug);
      if (index === undefined) {
        index = groups.length;
        groupIndex.set(post.slug, index);
        groups.push([]);
      }
      groups[index].push(post);
    }
  }
  const rounds = groups.reduce((max, group) => Math.max(max, group.length), 0);
  const feed = [];
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (round < group.length) feed.push(group[(round + i) % group.length]);
    }
  }
  return feed;
})();

/**
 * Posts for the feed.
 *   getAllPosts()        → all languages, mixed
 *   getAllPosts('fr')    → only French, newest-first
 *   getAllPosts('all')   → same as no argument
 */
export function getAllPosts(lang) {
  if (!lang || lang === 'all') return MIXED;
  return POSTS_BY_LANG[lang] || [];
}

export const POSTS_PER_PAGE = 6;

/** One page of posts (page is 1-based), optionally scoped to one language. */
export function getPostsPage(page = 1, perPage = POSTS_PER_PAGE, lang) {
  const all = getAllPosts(lang);
  const totalPosts = all.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    posts: all.slice(start, start + perPage),
    page: safePage,
    totalPages,
    totalPosts,
  };
}

/**
 * Resolve one article. Translations share the slug with the English
 * post, so the language decides which variant you get:
 *   getPostBySlug('webgpu_vs_wasm_f4a7d6')        → English
 *   getPostBySlug('webgpu_vs_wasm_f4a7d6', 'ja')  → Japanese
 */
export function getPostBySlug(slug, lang = DEFAULT_LANG) {
  if (!isSupportedLang(lang)) return null;
  return (POSTS_BY_LANG[lang] || []).find((p) => p.slug === slug) || null;
}

/** Canonical in-app URL for a post (English stays unprefixed). */
export function postPath(post) {
  if (!post) return '/blogs';
  return post.lang && post.lang !== DEFAULT_LANG
    ? `/blogs/${post.lang}/${post.slug}`
    : `/blogs/${post.slug}`;
}

/**
 * Related posts: ranks the others from the SAME language by shared tags,
 * falling back to recency. Always returns `limit` posts when possible.
 */
export function getRelatedPosts(slug, limit = 3, lang = DEFAULT_LANG) {
  const current = getPostBySlug(slug, lang);
  const others = getAllPosts(lang).filter((p) => p.slug !== slug);
  if (!current) return others.slice(0, limit);

  const currentTags = new Set(current.tags.map((t) => t.toLowerCase()));
  const scored = others.map((p) => {
    const shared = p.tags.filter((t) => currentTags.has(t.toLowerCase())).length;
    return { post: p, shared };
  });
  scored.sort((a, b) => {
    if (b.shared !== a.shared) return b.shared - a.shared;
    return a.post.date < b.post.date ? 1 : -1;
  });
  return scored.slice(0, limit).map((s) => s.post);
}

/** All unique tags with post counts (alphabetical), scoped to one language when given. */
export function getAllTags(lang) {
  const counts = new Map();
  for (const post of getAllPosts(lang)) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Plain-text version of a post's blocks — used for word counts / read time. */
export function postPlainText(post) {
  return post.blocks
    .map((b) => {
      if (b.items) return b.items.join(' ');
      return b.text || '';
    })
    .join(' ');
}

/** Rough reading time in minutes (min 1). Handles CJK scripts, which have no word spaces. */
export function getReadTime(post) {
  const text = postPlainText(post).trim();
  const spacedWords = text ? text.split(/\s+/).length : 0;
  // Japanese/Chinese set most characters without spaces: count them at a
  // lighter weight so they don't explode the estimate.
  const cjkChars = (text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  const words = spacedWords + cjkChars * 0.6;
  return Math.max(1, Math.round(words / 200));
}

/** "October 10, 2026" style formatting from 'YYYY-MM-DD'. */
export function formatDate(iso) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[m - 1]} ${d}, ${y}`;
  } catch {
    return iso;
  }
}
