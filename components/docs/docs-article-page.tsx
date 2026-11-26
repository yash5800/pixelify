"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, AlertTriangle, Lightbulb,
  Info, Play, ExternalLink, ArrowRight
} from "lucide-react";
import { DocsShell } from "./docs-shell";
import { Article, articles } from "@/data/docs/docs-data";

export function DocsArticlePage({ article }: { article: Article }) {
  const ordered = Object.values(articles);
  const index = ordered.findIndex((a) => a.slug === article.slug);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];

  const toc = useMemo(
    () =>
      article.blocks
        .filter((b) => b.type === "heading")
        .map((b: any) => ({ id: b.id, text: b.text })),
    [article]
  );

  const [activeHeading, setActiveHeading] = useState<string>(toc[0]?.id || "");

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActiveHeading(visible.target.id);
        }
      },
      {
        rootMargin: "-90px 0px -55% 0px",
        threshold: 0.1,
      }
    );

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  return (
    <DocsShell>
      <motion.div
        className="px-article-layout"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <article className="px-article">
          <div className="px-breadcrumb">
            <Link href="/docs/">Docs</Link>
            <ChevronRight size={14} />
            <span>{article.category}</span>
          </div>

          <div className="px-article-heading">
            <div className="px-article-category">{article.category}</div>
            <h1>{article.title}</h1>
            <p>{article.description}</p>
          </div>

          <div className="px-article-body">
            {article.blocks.map((block: any, i) => {
              if (block.type === "paragraph") return <p key={i}>{block.text}</p>;
              if (block.type === "heading") return <h2 id={block.id} key={i}>{block.text}</h2>;
              if (block.type === "callout") {
                const Icon = block.tone === "warning" ? AlertTriangle : block.tone === "tip" ? Lightbulb : Info;
                return (
                  <div key={i} className={`px-callout px-callout-${block.tone}`}>
                    <span className="px-callout-icon"><Icon size={20} /></span>
                    <div>
                      <strong>{block.title}</strong>
                      <p>{block.text}</p>
                    </div>
                  </div>
                );
              }
              if (block.type === "steps") {
                return (
                  <div className="px-steps" key={i}>
                    {block.items.map((step: any, j: number) => (
                      <div className="px-step" key={j}>
                        <div className="px-step-number">{String(j + 1).padStart(2, "0")}</div>
                        <div>
                          <strong>{step.title}</strong>
                          <p>{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              if (block.type === "bullets") {
                return (
                  <ul key={i}>
                    {block.items.map((item: string, j: number) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                );
              }
              if (block.type === "code") return <CodeBlock key={i} block={block} />;
              if (block.type === "video") return <VideoBlock key={i} block={block} />;
              if (block.type === "table") {
                return (
                  <div className="px-table-wrap" key={i}>
                    <table>
                      <thead>
                        <tr>
                          {block.headers.map((h: string) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((r: string[], j: number) => (
                          <tr key={j}>
                            {r.map((c, k) => (
                              <td key={k}>{c}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return null;
            })}
          </div>

          <div className="px-article-feedback">
            <span>Was this documentation guide helpful?</span>
            <a href="/contact" className="px-contact-btn" aria-label="Send feedback" target="_self" rel="noopener noreferrer">
              Send feedback <ExternalLink size={13} />
            </a>
          </div>

          {/* PREVIOUS / NEXT NAVIGATION */}
          <div className="px-prev-next">
            {prev ? (
              <Link href={`/docs/${prev.slug}`} className="px-prev-card group">
                <span className="px-prev-next-label">Previous</span>
                <div className="px-prev-title-wrap">
                  <ChevronLeft size={18} className="px-prev-chevron" />
                  <strong className="px-prev-next-title">{prev.title}</strong>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link href={`/docs/${next.slug}`} className="px-next-card group">
                <span className="px-prev-next-label">Next</span>
                <div className="px-next-title-wrap">
                  <strong className="px-prev-next-title">{next.title}</strong>
                  <ChevronRight size={18} className="px-next-chevron" />
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </article>

        {/* ON THIS PAGE TABLE OF CONTENTS WITH ACTIVE SECTION HIGHLIGHT */}
        <aside className="px-toc">
          <div className="px-toc-sticky">
            <div className="px-toc-title">ON THIS PAGE</div>
            <nav className="px-toc-nav" aria-label="Table of contents">
              {toc.map((item) => (
                <a
                  href={`#${item.id}`}
                  key={item.id}
                  className={`px-toc-link ${activeHeading === item.id ? "is-active" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(item.id);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                      setActiveHeading(item.id);
                    }
                  }}
                >
                  {item.text}
                </a>
              ))}
            </nav>

            <div className="px-toc-help">
              <strong>Need troubleshooting?</strong>
              <p>Find quick answers for WebGPU, browser memory, and models.</p>
              <Link href="/docs/troubleshooting">
                Get help <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </aside>
      </motion.div>
    </DocsShell>
  );
}

function CodeBlock({ block }: { block: any }) {
  return (
    <div className="px-code-block">
      <div className="px-code-head">
        <span>{block.title || "Example"}</span>
        <span>{block.language}</span>
      </div>
      <pre><code>{block.code}</code></pre>
    </div>
  );
}

function VideoBlock({ block }: { block: any }) {
  return (
    <div className="px-video-card">
      {block.videoUrl ? (
        <div className="px-video-frame">
          <iframe
            src={block.videoUrl}
            title={block.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="px-video-placeholder">
          <div className="px-video-placeholder-orb" />
          <div className="px-play-button">
            <Play size={20} fill="currentColor" />
          </div>
          <span>PIXELIFY VIDEO GUIDE</span>
        </div>
      )}
      <div className="px-video-card-copy">
        <div>
          <strong>{block.title}</strong>
          <p>{block.description}</p>
        </div>
        <span className="px-video-duration">{block.duration}</span>
      </div>
    </div>
  );
}
