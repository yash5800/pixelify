import { DocsHome } from "@/components/docs/docs-home";

export const metadata = {
  title: "Pixelify Docs - Learn, create, and get more from Pixelify",
  description: "Guides, tutorials, and answers for Pixelify's browser-based AI image tools.",
  alternates: { canonical: "/docs/" },
};

export default function DocsPage() {
  return <DocsHome />;
}
