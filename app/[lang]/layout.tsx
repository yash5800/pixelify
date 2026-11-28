import { notFound } from 'next/navigation';
import { PREFIXED_LANGUAGES } from '@/lib/i18n';

export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!PREFIXED_LANGUAGES.some((l) => l.code === params.lang)) {
    notFound();
  }
  return <>{children}</>;
}