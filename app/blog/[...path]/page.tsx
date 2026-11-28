import { Suspense } from 'react';
import type { Metadata } from 'next';
import BlogPostView from '@/components/BlogPostView';
import BlogListView from '@/components/BlogListView';
import NotFound from '@/components/NotFound';
import { getAllPosts, getPostBySlug, postPath, isSupportedLang, langLabel, LANGUAGES } from '@/data/posts';
import { SITE_URL, blogIndexAlternates, blogIndexHref } from '@/lib/seo';

// Every valid blog URL is enumerated in generateStaticParams; unknown paths
// should 404 rather than render a soft-not-found page under an arbitrary URL.
export const dynamicParams = false;

/** English blog URLs are unprefixed (`/blog/`), so never generate `/blog/en/`. */
const PREFIXED_BLOG_LANGUAGES = LANGUAGES.filter((lang) => lang.code !== 'en');

export function generateStaticParams() {
  return [
    // /blog/<lang> - localized index pages (English lives at /blog/)
    ...PREFIXED_BLOG_LANGUAGES.map((lang) => ({ path: [lang.code] })),
    // /blog/<slug> - English articles
    ...getAllPosts('en').map((post) => ({ path: [post.slug] })),
    // /blog/<lang>/<slug> - translated articles
    ...PREFIXED_BLOG_LANGUAGES.flatMap((l) =>
      getAllPosts(l.code).map((post) => ({ path: [post.lang, post.slug] }))
    ),
  ];
}

type Params = { params: { path: string[] } };

type Resolved =
  | { post: ReturnType<typeof getPostBySlug>; lang: string; path: string[]; langIndex?: never }
  | { post: null; lang: string; path: string[]; langIndex: string };

function resolve(params: { path: string[] }): Resolved {
  const { path } = params;
  // /blog/<lang> - a localized index page
  if (path.length === 1 && isSupportedLang(path[0])) {
    return { post: null, lang: path[0], path, langIndex: path[0] };
  }
  if (path.length === 2 && !isSupportedLang(path[0])) return { post: null, path: [path[1]], lang: 'en' };
  if (path.length === 1) return { post: getPostBySlug(path[0], 'en'), path, lang: 'en' };
  const lang = path[0];
  if (!isSupportedLang(lang)) return { post: null, path, lang: 'en' };
  return { post: getPostBySlug(path[1], lang), path, lang };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolved = resolve(params);

  // Localized index page: /blog/<lang>/
  if (resolved.post === null && resolved.langIndex) {
    const lang = resolved.langIndex;
    return {
      title: `${langLabel(lang)} blog | Pixelify`,
      description: `In-depth articles about on-device AI, covering background removal, upscaling and privacy-first image tools, in ${langLabel(lang)}: no cloud, no uploads, no tracking.`,
      alternates: {
        canonical: blogIndexHref(lang),
        languages: blogIndexAlternates(),
      },
      openGraph: {
        type: 'website',
        title: `${langLabel(lang)} blog | Pixelify`,
        description: `On-device AI articles in ${langLabel(lang)}: no cloud, no uploads, no tracking.`,
        url: `${SITE_URL}${blogIndexHref(lang)}`,
        locale: lang,
        images: [{ url: '/blog/settings-engine.jpg', alt: 'Pixelify blog cover' }],
      },
    };
  }

  const { post, lang } = resolved;
  if (!post) {
    return { title: 'Article not found | Pixelify' };
  }
  const url = `${SITE_URL}${postPath(post)}`;
  const siblings = LANGUAGES.flatMap((l) => getAllPosts(l.code)).filter((p) => p.slug === post.slug);
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

  // Localized index page: /blog/<lang>/
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

  const siblings = LANGUAGES.flatMap((l) => getAllPosts(l.code)).filter((p) => p.slug === post.slug);

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
