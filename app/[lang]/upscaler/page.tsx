import type { Metadata } from 'next';
import UpscalerView from '@/components/views/UpscalerView';
import { PREFIXED_LANGUAGES } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo-pages';

export function generateStaticParams() {
  return PREFIXED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  return pageMetadata('upscaler', params.lang);
}

export default function LocalizedUpscalerPage() {
  return <UpscalerView />;
}
