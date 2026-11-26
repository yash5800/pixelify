import type { Metadata } from 'next';
import PrivacyView from '@/components/PrivacyView';
import { SITE_LANGUAGES } from '@/lib/i18n';
import { localizedHref } from '@/lib/seo';

export function generateStaticParams() {
  return SITE_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = params.lang;
  return {
    title: 'Privacy Policy: Zero Uploads, Zero Tracking | Pixelify',
    description:
      'The Pixelify privacy policy, written to be checkable against the code: images are processed on-device, nothing is uploaded, models are cached locally, and analytics are cookie-free.',
    alternates: { canonical: localizedHref(lang, '/privacy/') },
  };
}

export default function LocalizedPrivacyPage() {
  return <PrivacyView />;
}

