import type { Metadata } from 'next';
import BgRemoveView from '@/components/views/BgRemoveView';
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
    title: 'Background Remover: Instant AI Cutouts, 100% Private | Pixelify',
    description:
      'Remove image backgrounds in seconds with Chopper AI: precision cutouts for portraits, products and graphics, processed entirely in your browser with WebGPU. No uploads, no cloud.',
    alternates: { canonical: localizedHref(lang, '/bg_remove/') },
  };
}

export default function LocalizedBgRemovePage() {
  return <BgRemoveView />;
}

