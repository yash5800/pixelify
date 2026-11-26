import LangAttribute from '@/components/LangAttribute';
import { SITE_LANGUAGES } from '@/lib/i18n';

export function generateStaticParams() {
  return SITE_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

// Only the supported language segments exist. Anything else 404s instead of
// rendering a duplicate page under an arbitrary prefix.
export const dynamicParams = false;

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  return (
    <>
      <LangAttribute lang={params.lang} />
      {children}
    </>
  );
}
