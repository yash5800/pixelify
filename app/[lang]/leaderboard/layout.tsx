import type { Metadata } from 'next';
import { localizedHref } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  return {
    title: 'Pixelify Leaderboard | Community Image Creators',
    description:
      'See how Pixelify community members rank through successful background removal and AI upscaling.',
    alternates: { canonical: localizedHref(params.lang, '/leaderboard/') },
  };
}

export default function LocalizedLeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
