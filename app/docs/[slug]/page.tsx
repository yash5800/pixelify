import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsArticlePage } from "@/components/docs/docs-article-page";
import { DocsHome } from "@/components/docs/docs-home";
import { articles } from "@/data/docs/docs-data";

export function generateStaticParams() {
  return [...Object.keys(articles), "overview"].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
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
    alternates: { canonical: `/docs/${slug}/` },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "overview") {
    return <DocsHome />;
  }
  const article = articles[slug];

  if (!article) notFound();

  return <DocsArticlePage article={article} />;
}
