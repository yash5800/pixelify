import type { Metadata } from 'next';
import { localizedHref } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  return {
    title: 'My Activity | Pixelify',
    description: 'Review your personal Pixelify image processing activity, points, and achievements.',
    robots: { index: false, follow: false },
    alternates: { canonical: localizedHref(params.lang, '/leaderboard/activity/') },
  };
}

export default function LocalizedActivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
