import type { Metadata } from 'next';
import HomeView from '@/components/views/HomeView';
import { pageMetadata } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata('home', 'en');

export default function Home() {
  return <HomeView />;
}
