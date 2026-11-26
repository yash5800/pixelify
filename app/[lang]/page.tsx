import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomeView from '@/components/views/HomeView';
import { SITE_LANGUAGES, getLanguageInfo } from '@/lib/i18n';

export const dynamicParams = false;

export function generateStaticParams() {
  return SITE_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = params.lang;
  if (!SITE_LANGUAGES.some((l) => l.code === lang)) {
    return { title: 'Page Not Found | Pixelify' };
  }
  const info = getLanguageInfo(lang);
  return {
    alternates: { canonical: `/${lang}/` },
    openGraph: {
      locale: lang,
    },
  };
}

export default function LocalizedHomePage({
  params,
}: {
  params: { lang: string };
}) {
  if (!SITE_LANGUAGES.some((l) => l.code === params.lang)) {
    notFound();
  }
  return <HomeView />;
}