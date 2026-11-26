import type { Metadata } from 'next';
import UpscalerView from '@/components/views/UpscalerView';
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
    title: 'AI Image Upscaler: 4×/8× Super-Resolution In Your Browser | Pixelify',
    description:
      'Upscale and enhance photos up to 8× with the Vitality, Pixel-Dance and Alpha-Satoru diffusion models, running entirely on-device via WebGPU & WASM. Private, free and fast try-out, no sign-up.',
    alternates: { canonical: localizedHref(lang, '/upscaler/') },
  };
}

export default function LocalizedUpscalerPage() {
  return <UpscalerView />;
}

