import type { Metadata } from 'next';
import AboutView from '@/components/AboutView';
import { SITE_LANGUAGES } from '@/lib/i18n';
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
  return {
    title: 'About Pixelify: Who We Are & Why Everything Runs On-Device',
    description:
      'Meet Pixelify: an independent studio building private, on-device AI imaging tools. How the models work, why images never leave your browser, and where the project is heading.',
    alternates: { canonical: localizedHref(lang, '/about/') },
  };
}

export default function LocalizedAboutPage() {
  return <AboutView />;
}

