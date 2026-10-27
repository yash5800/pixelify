import type { Metadata } from 'next';
import DocumentationView from '@/components/DocumentationView';

export const metadata: Metadata = {
  title: 'Pixelify Help Center | Guides & Documentation',
  description:
    'Learn how to use Pixelify’s on-device image upscaler and background remover, check browser requirements, and find help for common issues.',
  alternates: { canonical: '/docs/' },
};

export default function DocumentationPage() {
  return <DocumentationView />;
}
