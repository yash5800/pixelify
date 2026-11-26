import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlogListView from '@/components/BlogListView';
import { SITE_LANGUAGES, getLanguageInfo } from '@/lib/i18n';
import { blogIndexAlternates, blogIndexHref } from '@/lib/seo';

export function generateStaticParams() {
  return SITE_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = params.lang;
  const info = getLanguageInfo(lang);
  return {
    title: `${info.nativeLabel} Blog & AI Guides | Pixelify`,
    description:
      'In-depth articles about local AI, privacy, background removal, upscaling, WebGPU and how the site runs image processing on-device: no cloud uploads or cross-site tracking.',
    alternates: {
      canonical: blogIndexHref(lang),
      languages: blogIndexAlternates(),
    },
  };
}

export default function LocalizedBlogsPage({
  params,
}: {
  params: { lang: string };
}) {
  return (
    <Suspense>
      <BlogListView initialLang={params.lang} />
    </Suspense>
  );
}

