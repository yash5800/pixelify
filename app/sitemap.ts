import type { MetadataRoute } from 'next';
import { getAllPosts, postPath, LANGUAGES } from '@/data/posts';
import { articles } from '@/data/docs/docs-data';
import { SITE_LANGUAGES } from '@/lib/i18n';
import {
  SITE_URL,
  blogIndexAlternates,
  blogIndexHref,
  languageAlternates,
  localizedHref,
} from '@/lib/seo';

export const dynamic = 'force-static';

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

type RouteConfig = {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

const DEFAULT_LANG = 'en';

/**
 * Indexable public pages, roughly in order of importance.
 * `/overview/` is an alias of `/docs/` and `/leaderboard/activity/` is
 * noindex, so neither is listed here.
 */
const STATIC_ROUTES: RouteConfig[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/upscaler/', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/bg_remove/', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/blog/', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/docs/', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/products/', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/leaderboard/', changeFrequency: 'daily', priority: 0.5 },
  { path: '/about/', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/story/', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact/', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/privacy/', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms/', changeFrequency: 'yearly', priority: 0.3 },
];

const NON_DEFAULT_LANGUAGES = SITE_LANGUAGES.filter(({ code }) => code !== DEFAULT_LANG);

/**
 * Docs are English-only, and blog indexes use `/blog/<lang>/` instead of
 * `/<lang>/blog/`, so neither belongs in the generic localized set.
 */
const LOCALIZED_ROUTES = STATIC_ROUTES.filter(
  ({ path }) => path !== '/docs/' && path !== '/blog/'
);

const absolute = (path: string) => `${SITE_URL}${path}`;

const absoluteLanguages = (languages: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(languages).map(([lang, href]) => [lang, absolute(href)])
  );

const alternatesFor = (path: string) => {
  if (path === '/docs/') return undefined;
  return {
    languages: absoluteLanguages(
      path === '/blog/' ? blogIndexAlternates() : languageAlternates(path)
    ),
  };
};

const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
  ({ path, changeFrequency, priority }) => ({
    url: absolute(path),
    changeFrequency,
    priority,
    alternates: alternatesFor(path),
  })
);

const localizedEntries: MetadataRoute.Sitemap = NON_DEFAULT_LANGUAGES.flatMap(({ code }) =>
  LOCALIZED_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absolute(localizedHref(code, path)),
    changeFrequency,
    priority: Math.max(0.3, Number((priority - 0.2).toFixed(1))),
    alternates: {
      languages: absoluteLanguages(languageAlternates(path)),
    },
  }))
);

// Docs are authored in English only; every article has a static route at /docs/<slug>/.
const docsEntries: MetadataRoute.Sitemap = Object.values(articles).map((article) => ({
  url: absolute(`/docs/${article.slug}/`),
  changeFrequency: 'monthly',
  priority: article.featured ? 0.7 : 0.6,
}));

// Localized blog indexes live at /blog/<lang>/.
const blogIndexEntries: MetadataRoute.Sitemap = NON_DEFAULT_LANGUAGES.map(({ code }) => ({
  url: absolute(blogIndexHref(code)),
  changeFrequency: 'weekly',
  priority: 0.7,
  alternates: { languages: absoluteLanguages(blogIndexAlternates()) },
}));

// Group translations by slug so every post lists its hreflang alternates.
const postsBySlug = new Map<string, ReturnType<typeof getAllPosts>>();
for (const { code } of LANGUAGES) {
  for (const post of getAllPosts(code)) {
    const siblings = postsBySlug.get(post.slug) ?? [];
    siblings.push(post);
    postsBySlug.set(post.slug, siblings);
  }
}

const postEntries: MetadataRoute.Sitemap = [...postsBySlug.values()].flatMap((siblings) => {
  const languages = Object.fromEntries(
    siblings.map((post) => [post.lang, absolute(`${postPath(post)}/`)])
  );

  return siblings.map((post) => ({
    url: absolute(`${postPath(post)}/`),
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: post.lang === DEFAULT_LANG ? 0.7 : 0.6,
    alternates: { languages },
  }));
});

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...staticEntries,
    ...docsEntries,
    ...localizedEntries,
    ...blogIndexEntries,
    ...postEntries,
  ];
}
