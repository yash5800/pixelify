import { Suspense } from 'react';
import type { Metadata } from 'next';
import BlogPostView from '@/components/BlogPostView';
import BlogListView from '@/components/BlogListView';
import NotFound from '@/components/NotFound';
import { getAllPosts, getPostBySlug, postPath, isSupportedLang, langLabel, LANGUAGES } from '@/data/posts';
import { SITE_URL } from '@/lib/seo';

export function generateStaticParams() {
  return [
    // /blogs/<lang> — localized index pages (plus /blogs/en/ as a permalink)
    ...LANGUAGES.map((lang) => ({ path: [lang.code] })),
    // /blogs/<slug> — English articles
    ...getAllPosts('en').map((post) => ({ path: [post.slug] })),
    // /blogs/<lang>/<slug> — translations (plus /blogs/en/<slug> for legacy links)
    ...getAllPosts().flatMap((post) => {
      const segments = [{ path: [post.lang, post.slug] }];
      if (post.lang === 'en') {
        segments.push({ path: ['en', post.slug] });
      }
      return segments;
    }),
  ];
}

type Params = { params: { path: string[] } };

type Resolved =
  | { post: ReturnType<typeof getPostBySlug>; lang: string; path: string[]; langIndex?: never }
  | { post: null; lang: string; path: string[]; langIndex: string };

function resolve(params: { path: string[] }): Resolved {
  const { path } = params;
  // /blogs/<lang> — a localized index page
  if (path.length === 1 && isSupportedLang(path[0])) {
    return { post: null, lang: path[0], path, langIndex: path[0] };
  }
  if (path.length === 2 && !isSupportedLang(path[0])) return { post: null, path: [path[1]], lang: 'en' };
  if (path.length === 1) return { post: getPostBySlug(path[0], 'en'), path, lang: 'en' };
  const lang = path[0];
  if (!isSupportedLang(lang)) return { post: null, path, lang: 'en' };
  return { post: getPostBySlug(path[1], lang), path, lang };
}

function langIndexHref(lang: string): string {
  return isSupportedLang(lang) ? `/blogs/${lang}/` : '/blogs/';
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolved = resolve(params);

  // Localized index page: /blogs/<lang>/
  if (resolved.post === null && resolved.langIndex) {
    const lang = resolved.langIndex;
    return {
      title: `${langLabel(lang)} blog | Pixelify`,
      description: `In-depth articles about on-device AI, covering background removal, upscaling and privacy-first image tools, in ${langLabel(lang)}: no cloud, no uploads, no tracking.`,
      alternates: {
        canonical: langIndexHref(lang),
        languages: Object.fromEntries(LANGUAGES.map((l) => [l.code, langIndexHref(l.code)])),
      },
      openGraph: {
        type: 'website',
        title: `${langLabel(lang)} blog | Pixelify`,
        description: `On-device AI articles in ${langLabel(lang)}: no cloud, no uploads, no tracking.`,
        url: `${SITE_URL}${langIndexHref(lang)}`,
        locale: lang,
        images: [{ url: '/blogs/home-hero.jpg', alt: 'Pixelify blog cover' }],
      },
    };
  }

  const { post, lang } = resolved;
  if (!post) {
    return { title: 'Article not found | Pixelify' };
  }
  const url = `${SITE_URL}${postPath(post)}`;
  const siblings = getAllPosts().filter((p) => p.slug === post.slug);
  return {
    title: `${post.title} | Pixelify`,
    description: post.description,
    alternates: {
      canonical: postPath(post),
      languages: Object.fromEntries(siblings.map((p) => [p.lang, postPath(p)])),
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      locale: lang === 'en' ? 'en_US' : lang,
      alternateLocale: LANGUAGES.map((l) => l.code).filter((c) => c !== lang),
      images: [{ url: post.cover, alt: post.coverAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.cover],
    },
  };
}

export default function BlogCatchAll({ params }: Params) {
  const resolved = resolve(params);

  // Localized index page: /blogs/<lang>/
  if (resolved.post === null && resolved.langIndex) {
    return (
      <Suspense fallback={null}>
        <BlogListView initialLang={resolved.langIndex} />
      </Suspense>
    );
  }

  const { post, lang } = resolved;
  if (!post) {
    return <NotFound />;
  }

  const siblings = getAllPosts().filter((p) => p.slug === post.slug);

  return (
    <>
      <BlogPostView slug={post.slug} lang={lang} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            author: { '@type': 'Organization', name: post.author },
            datePublished: post.date,
            dateModified: post.date,
            inLanguage: post.lang,
            keywords: post.tags.join(', '),
            image: `${SITE_URL}${post.cover}`,
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${postPath(post)}` },
            translationOfWork: siblings
              .filter((p) => p.lang !== post.lang)
              .map((p) => ({ '@id': `${SITE_URL}${postPath(p)}`, inLanguage: p.lang, label: langLabel(p.lang) })),
            publisher: {
              '@type': 'Organization',
              name: 'Pixelify',
              logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
            },
          }),
        }}
      />
    </>
  );
}
