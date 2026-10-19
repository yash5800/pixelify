import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlogListView from '@/components/BlogListView';

export const metadata: Metadata = {
  title: 'Blog & AI Guides: On-Device AI, Privacy & Upscaling | Pixelify',
  description:
    'In-depth articles about local AI, privacy, background removal, upscaling, WebGPU and how the site runs everything on-device: no cloud, no uploads, no tracking.',
  alternates: { canonical: '/blogs/' },
  openGraph: {
    title: 'Blog & Guides · Pixelify',
    description:
      'In-depth articles on local AI, privacy-first image processing, background removal and super-resolution.',
    type: 'website',
  },
};

export default function BlogsPage() {
  return (
    <Suspense>
      <BlogListView />
    </Suspense>
  );
}
