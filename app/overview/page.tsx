import { DocsHome } from "@/components/docs/docs-home";

export const metadata = {
  title: "Pixelify Docs - Overview",
  description: "Overview, guides, and tutorials for Pixelify's browser-based AI image tools.",
  // The docs home is served at /docs/; keep /overview/ as a working alias
  // without letting it compete as a separate indexable URL.
  alternates: { canonical: "/docs/" },
};

export default function OverviewPage() {
  return <DocsHome />;
}
