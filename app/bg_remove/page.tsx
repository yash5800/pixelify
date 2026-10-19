import type { Metadata } from 'next';
import BgRemoveView from '@/components/views/BgRemoveView';

export const metadata: Metadata = {
  title: 'Background Remover: Instant AI Cutouts, 100% Private | Pixelify',
  description:
    'Remove image backgrounds in seconds with Chopper AI: precision cutouts for portraits, products and graphics, processed entirely in your browser with WebGPU. No uploads, no cloud.',
  alternates: { canonical: '/bg_remove/' },
};

export default function BgRemovePage() {
  return <BgRemoveView />;
}
