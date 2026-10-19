import type { Metadata } from 'next';
import ProductsView from '@/components/ProductsView';

export const metadata: Metadata = {
  title: 'Pixelify Products: AI Upscaler & Background Remover',
  description:
    'Explore the Pixelify product suite: the 8× AI image upscaler studio and the Chopper neural background remover. Full specifications, privacy guarantees and everything you can build with them.',
  alternates: { canonical: '/products/' },
};

export default function ProductsPage() {
  return <ProductsView />;
}
