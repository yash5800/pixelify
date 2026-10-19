import type { Metadata } from 'next';
import TermsView from '@/components/TermsView';

export const metadata: Metadata = {
  title: 'Terms of Service | Pixelify',
  description:
    'Terms of Service for using Pixelify, the free on-device AI photo editor: fair use of the AI upscaler and background remover, liability and copyright guidelines.',
  alternates: { canonical: '/terms/' },
};

export default function TermsPage() {
  return <TermsView />;
}
