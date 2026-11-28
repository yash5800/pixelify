import { DocsHome } from "@/components/docs/docs-home";
import { PREFIXED_LANGUAGES } from '@/lib/i18n';

export function generateStaticParams() {
  return PREFIXED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export const metadata = {
  title: "Pixelify Docs - Overview",
  description: "Guides, tutorials, and answers for Pixelify's browser-based AI image tools.",
  // Docs are authored in English only, so every localized alias points at
  // the English canonical instead of competing with it.
  alternates: { canonical: "/docs/" },
};

export default function LocalizedDocsPage() {
  return <DocsHome />;
}
