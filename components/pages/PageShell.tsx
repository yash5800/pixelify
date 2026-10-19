import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ViewTab } from '../../types';
import Footer from '../Footer';

/* --------------------------------------------------------------------------
   PageShell — shared chrome for the static pages (About, Products, Privacy,
   Terms). Keeps one header style, one section rhythm, one doc-title effect
   and the site footer, so the four pages cannot drift apart visually.
-------------------------------------------------------------------------- */

export interface TocItem {
  id: string;
  label: string;
}

interface PageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Shown right-aligned in the header, e.g. "Last updated: October 12, 2026". */
  updated?: string;
  toc?: TocItem[];
  documentTitle: string;
  metaDescription: string;
  onTabChange: (tab: ViewTab) => void;
  children: ReactNode;
}

export default function PageShell({
  eyebrow,
  title,
  description,
  updated,
  toc,
  documentTitle,
  metaDescription,
  onTabChange,
  children,
}: PageShellProps) {
  useEffect(() => {
    document.title = documentTitle;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = metaDescription;
    window.scrollTo(0, 0);
  }, [documentTitle, metaDescription]);

  return (
    <div className="w-full">
      {/* ============================================================
          PAGE HEADER — same rhythm as the blog index
      ============================================================ */}
      <header className="w-full border-b border-white/10 bg-[#08080B]">
        <div className="w-full px-4 pb-10 pt-8 sm:px-6 lg:px-10">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#A4D641]">
            {eyebrow}
          </span>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl">
              {title}
            </h1>
            {updated && (
              <span className="font-mono text-[12px] text-muted">{updated}</span>
            )}
          </div>

          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-muted">
            {description}
          </p>

          {/* ON THIS PAGE */}
          {toc && toc.length > 0 && (
            <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
              {toc.map((item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-full border border-white/15 bg-[#121218] px-3.5 py-1.5 text-[13px] font-medium text-white/70 transition hover:border-[#A4D641]/40 hover:text-white"
                >
                  <span className="mr-1.5 font-mono text-[12px] font-bold text-[#A4D641]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* ============================================================
          BODY
      ============================================================ */}
      <article className="w-full px-4 pb-16 pt-14 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </article>

      <Footer onTabChange={onTabChange} />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Section — numbered section with an anchor, used by every static page
-------------------------------------------------------------------------- */

export function Section({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num: number | string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24 first:mt-0">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[15px] font-bold tracking-[0.2em] text-[#A4D641]">
          {String(num).padStart(2, '0')}
        </span>
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
      </div>
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted [&_a]:font-medium [&_a]:text-[#A4D641] [&_a:hover]:underline [&_a:hover]:underline-offset-4 [&_strong]:font-semibold [&_strong]:text-white">
        {children}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   Small content primitives so pages stay declarative and consistent
-------------------------------------------------------------------------- */

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="relative pl-6">
          <span aria-hidden className="absolute left-0 top-[0.55em] h-1.5 w-1.5 rounded-sm bg-[#A4D641]" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Highlighted callout box — used for the "bottom line" facts. */
export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#A4D641]/25 bg-[#A4D641]/[0.06] p-5">
      <p className="text-[13px] font-bold uppercase tracking-wider text-[#A4D641]">
        {title}
      </p>
      <div className="mt-2.5 space-y-2 text-[14px] leading-relaxed text-white/80 [&_a]:font-medium [&_a]:text-[#A4D641] [&_a:hover]:underline">
        {children}
      </div>
    </div>
  );
}
