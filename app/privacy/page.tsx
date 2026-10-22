import type { Metadata } from 'next';
import PrivacyView from '@/components/PrivacyView';

export const metadata: Metadata = {
  title: 'Privacy Policy: Zero Uploads, Zero Tracking | Pixelify',
  description:
    'The Pixelify privacy policy, written to be checkable against the code: images are processed on-device by default, the optional cloud engine sends only a 512×512 thumbnail, models are cached locally, and analytics are cookie-free.',
  alternates: { canonical: '/privacy/' },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
