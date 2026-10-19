import type { Metadata } from 'next';
import AboutView from '@/components/AboutView';

export const metadata: Metadata = {
  title: 'About Pixelify: Who We Are & Why Everything Runs On-Device',
  description:
    'Meet Pixelify: an independent studio building private, on-device AI imaging tools. How the models work, why images never leave your browser, and where the project is heading.',
  alternates: { canonical: '/about/' },
};

export default function AboutPage() {
  return <AboutView />;
}
