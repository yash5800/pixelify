import { DocsHome } from "@/components/docs/docs-home";
import { SITE_LANGUAGES } from "@/lib/i18n";

export function generateStaticParams() {
  return SITE_LANGUAGES.map((lang) => ({ lang: lang.code }));
}

export const metadata = {
  title: "Pixelify Docs - Overview",
  description: "Overview, guides, and tutorials for Pixelify's browser-based AI image tools.",
  // Docs are authored in English only; consolidate every locale to /docs/.
  alternates: { canonical: "/docs/" },
};

export default function LocalizedOverviewPage() {
  return <DocsHome />;
}
