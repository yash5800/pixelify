import type { Metadata } from 'next';
import UpscalerView from '@/components/views/UpscalerView';

export const metadata: Metadata = {
  title: 'AI Image Upscaler: 4×/8× Super-Resolution In Your Browser | Pixelify',
  description:
    'Upscale and enhance photos up to 8× with the Vitality, Pixel-Dance and Alpha-Satoru diffusion models, running entirely on-device via WebGPU & WASM. Private, free and fast try-out, no sign-up.',
  alternates: { canonical: '/upscaler/' },
};

export default function UpscalerPage() {
  return <UpscalerView />;
}
