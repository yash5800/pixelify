import type { Metadata } from 'next';
import BgRemoveView from '@/components/views/BgRemoveView';
import { pageMetadata } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata('bg_remove', 'en');

export default function BgRemovePage() {
  return <BgRemoveView />;
}
