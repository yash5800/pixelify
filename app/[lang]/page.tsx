import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomeView from '@/components/views/HomeView';
import { PREFIXED_LANGUAGES } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo-pages';

export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = params.lang;
  if (!PREFIXED_LANGUAGES.some((l) => l.code === lang)) {
    return { title: 'Page Not Found | Pixelify' };
  }
  return pageMetadata('home', lang);
}

export default function LocalizedHomePage({
  params,
}: {
  params: { lang: string };
}) {
  if (!PREFIXED_LANGUAGES.some((l) => l.code === params.lang)) {
    notFound();
  }
  return <HomeView />;
}
