import type { Metadata } from 'next';
import StoryView from '@/components/StoryView';
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
    title: 'The Pixelify Story: From Pixels to On-Device AI',
    description:
      'How Pixelify went from a photo-editing experiment to a privacy-first, on-device AI studio, running neural upscaling and background removal without a single cloud upload.',
    alternates: { canonical: localizedHref(lang, '/story/') },
  };
}

export default function LocalizedStoryPage() {
  return <StoryView />;
}

