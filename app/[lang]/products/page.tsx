import type { Metadata } from 'next';
import ProductsView from '@/components/ProductsView';
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
    title: 'Pixelify Products: AI Upscaler & Background Remover',
    description:
      'Explore the Pixelify product suite: the 8× AI image upscaler studio and the Chopper neural background remover. Full specifications, privacy guarantees and everything you can build with them.',
    alternates: { canonical: localizedHref(lang, '/products/') },
  };
}

export default function LocalizedProductsPage() {
  return <ProductsView />;
}

