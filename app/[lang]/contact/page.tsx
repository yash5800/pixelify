import type { Metadata } from 'next';
import ContactView from '@/components/ContactView';
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
    title: 'Contact & Share Feedback | Pixelify AI Studio',
    description:
      'Get in touch with the indie creators behind Pixelify. Submit feature requests, bug reports, or general feedback directly to our team.',
    alternates: { canonical: localizedHref(lang, '/contact/') },
  };
}

export default function LocalizedContactPage() {
  return <ContactView />;
}

