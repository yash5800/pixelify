import type { Metadata } from 'next';
import UpscalerView from '@/components/views/UpscalerView';
import { pageMetadata } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata('upscaler', 'en');

export default function UpscalerPage() {
  return <UpscalerView />;
}
