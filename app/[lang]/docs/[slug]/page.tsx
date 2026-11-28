import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsArticlePage } from "@/components/docs/docs-article-page";
import { DocsHome } from "@/components/docs/docs-home";
import { articles } from "@/data/docs/docs-data";
import { PREFIXED_LANGUAGES } from "@/lib/i18n";

export function generateStaticParams() {
  const slugs = [...Object.keys(articles), "overview"];
  return PREFIXED_LANGUAGES.flatMap((l) =>
    slugs.map((slug) => ({ lang: l.code, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "overview") {
    return {
      title: "Pixelify Docs - Overview",
      description: "Overview, guides, and tutorials for Pixelify's browser-based AI image tools.",
      alternates: { canonical: "/docs/" },
    };
  }

  const article = articles[slug];
  if (!article) return {};

  return {
    title: `${article.title} | Pixelify Docs`,
    description: article.description,
    // Docs are English-only; localized aliases consolidate to the English URL.
    alternates: { canonical: `/docs/${slug}/` },
  };
}

export default async function LocalizedArticlePage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "overview") {
    return <DocsHome />;
  }
  const article = articles[slug];

  if (!article) notFound();

  return <DocsArticlePage article={article} />;
}
