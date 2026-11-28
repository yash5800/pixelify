import type { Metadata } from 'next';
import TermsView from '@/components/TermsView';
import { PREFIXED_LANGUAGES } from '@/lib/i18n';
import { localizedHref } from '@/lib/seo';

export function generateStaticParams() {
  return PREFIXED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = params.lang;
  return {
    title: 'Terms of Service | Pixelify',
    description:
      'Terms of Service for using Pixelify, the free on-device AI photo editor: fair use of the AI upscaler and background remover, liability and copyright guidelines.',
    alternates: { canonical: localizedHref(lang, '/terms/') },
  };
}

export default function LocalizedTermsPage() {
  return <TermsView />;
}

