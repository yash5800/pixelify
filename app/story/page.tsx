import type { Metadata } from 'next';
import StoryView from '@/components/StoryView';

export const metadata: Metadata = {
  title: 'The Pixelify Story: From Pixels to On-Device AI',
  description:
    'How Pixelify went from a photo-editing experiment to a privacy-first, on-device AI studio, running neural upscaling and background removal without a single cloud upload.',
  alternates: { canonical: '/story/' },
};

export default function StoryPage() {
  return <StoryView />;
}
