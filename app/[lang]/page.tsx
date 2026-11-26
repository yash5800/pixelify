import type { Metadata } from 'next';
import HomeView from '@/components/views/HomeView';
import { SITE_LANGUAGES, getLanguageInfo } from '@/lib/i18n';
import { localizedHref } from '@/lib/seo';

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
    alternates: { canonical: localizedHref(lang, '/') },
    openGraph: {
      locale: lang,
    },
  };
}

export default function LocalizedHomePage() {
  return <HomeView />;
}

