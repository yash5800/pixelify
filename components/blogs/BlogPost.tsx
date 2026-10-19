import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  formatDate,
  getReadTime,
  getPostBySlug,
  getRelatedPosts,
  isSupportedLang,
  langLabel,
  postPath,
} from '../../data/posts';
import { getBlogImageDims } from '../../lib/imageDims';
import type { ViewTab } from '../../types';
import BlogContent from './BlogContent';
import BlogCard from './BlogCard';
import Footer from '../Footer';

interface BlogPostProps {
  slug: string;
  lang?: string;
  onTabChange: (tab: ViewTab) => void;
}

/* Tag pill used by the reference design: label + divided "+" segment. */
export function TagPill({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full border border-white/20 text-[14px] text-white/90">
      <span className="px-3.5 py-1.5 leading-none">{tag}</span>
      <span aria-hidden="true" className="border-l border-white/20 px-2.5 py-1.5 leading-none text-white/60">
        +
      </span>
    </span>
  );
}

export default function BlogPost({ slug, lang, onTabChange }: BlogPostProps) {
  // /blogs/<slug> is English; /blogs/<lang>/<slug> is a translation.
  const postLang = lang && isSupportedLang(lang) ? lang : 'en';
  const post = slug ? getPostBySlug(slug, postLang) : null;
  const related = slug ? getRelatedPosts(slug, 3, postLang) : [];
  const [shared, setShared] = useState(false);

  // Reading a translated article should expose its language to screen
  // readers and to the browser; the page chrome stays English.
  useEffect(() => {
    const prev = document.documentElement.lang || 'en';
    document.documentElement.lang = postLang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [postLang]);

  // Working share: native share sheet when available, clipboard fallback otherwise.
  const handleShare = useCallback(async () => {
    if (!post) return;
    const url = `${window.location.origin}${postPath(post)}`;
    const shareData = { title: post.title, text: post.description, url };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        return;
      }
      throw new Error('navigator.share unavailable');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // user dismissed the sheet
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Last-resort fallback for non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }, [post]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug, postLang]);

  if (!post) {
    return (
      <div className="w-full">
        <div className="w-full px-4 py-24 text-center sm:px-6 lg:px-10">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#A4D641]">
            404
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Article not found</h1>
          <p className="mt-3 text-[15px] text-muted">The page you were looking for doesn't exist.</p>
          <Link
            href="/blogs"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-white/90"
          >
            ← Back to all articles
          </Link>
        </div>
        <Footer onTabChange={onTabChange} />
      </div>
    );
  }

  const readTime = getReadTime(post);
  const tagList = [...new Map(post.tags.map((t) => [t.toLowerCase(), t] as [string, string])).values()];

  return (
    <div className="w-full bg-[#0A0A0A]">
      {/* ============================================================
         ARTICLE HEADER — centered 720px column, Medium-style
         tags → title → author row → action bar → hero image
         ============================================================ */}
      <header className="w-full">
        <div className="mx-auto w-full max-w-[720px] px-4 pt-8 sm:px-6 sm:pt-12">
          {/* TAGS (above title, like the reference) */}
          <div className="flex flex-wrap gap-2.5">
            {tagList.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>

          {/* TITLE — bold sans, tight leading */}
          <h1 className="mt-7 text-[30px] font-bold leading-[1.16] tracking-[-0.02em] text-white sm:text-[42px]">
            {post.title}
          </h1>

          {/* AUTHOR ROW */}
          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/25 to-white/5 text-[15px] font-bold text-white ring-1 ring-white/15">
              P
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-[15px] font-medium text-white">{post.author}</span>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-1 text-[13px] font-medium leading-none text-white/90 transition hover:border-white/50 hover:text-white"
                  aria-label="Share this article"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                    <path d="M16 6l-4-4-4 4" />
                    <path d="M12 2v13" />
                  </svg>
                  {shared ? 'Link copied' : 'Share'}
                </button>
              </div>
              <div className="mt-1 text-[13px] text-white/55">
                {readTime} min read · {formatDate(post.date)}
              </div>
            </div>
          </div>
        </div>

        {/* HERO IMAGE — wider than the text column, plain (no card chrome) */}
        <div className="mx-auto w-full max-w-[908px] px-4 sm:px-6">
          <img
            src={post.cover}
            alt={post.coverAlt}
            {...getBlogImageDims(post.cover)}
            className="mt-10 mb-2 h-[clamp(240px,42vw,560px)] w-full object-cover object-center"
          />
        </div>
      </header>

      {/* ============================================================
         ARTICLE BODY — 720px column
         ============================================================ */}
      <article className="w-full px-4 sm:px-6">
        <div className="mx-auto w-full max-w-[720px] pb-16 pt-12">
          <BlogContent blocks={post.blocks} />
        </div>
      </article>

      {/* ============================================================
         FOOT MATTER — tags, then author card, inside the same column
         ============================================================ */}
      <div className="mx-auto w-full max-w-[720px] px-4 pb-16 sm:px-6">
        {/* TAGS (bottom, same pill style as the reference) */}
        <div className="flex flex-wrap gap-2.5 border-t border-white/10 pt-10">
          {tagList.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>

        {/* AUTHOR CARD */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-[#141414] p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/25 to-white/5 text-lg font-bold text-white ring-1 ring-white/15">
              P
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-white">{post.author}</div>
              <div className="text-[13px] leading-relaxed text-white/55">
                Writing about on-device AI, privacy and image tooling.
              </div>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-transparent px-4 py-1.5 text-[13px] font-medium leading-none text-white/90 transition hover:border-white/50 hover:text-white"
              aria-label="Share this article"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                <path d="M16 6l-4-4-4 4" />
                <path d="M12 2v13" />
              </svg>
              {shared ? 'Link copied' : 'Share'}
            </button>
          </div>
          {/* more-from row, like the reference's post-footer */}
          <div className="mt-5 border-t border-white/10 pt-4 text-[13px] text-white/55">
            More from{' '}
            <Link
              href={post.lang === 'en' ? '/blogs' : `/blogs?lang=${post.lang}`}
              className="font-medium text-white underline underline-offset-2 hover:text-white/80"
            >
              Pixelify Journal {post.lang !== 'en' && `(${langLabel(post.lang)})`}
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================
         RELATED ARTICLES
         ============================================================ */}
      {related.length > 0 && (
        <section className="w-full border-t border-white/10 bg-[#0F0F0F]">
          <div className="mx-auto w-full max-w-[1092px] px-4 py-14 sm:px-6">
            <h2 className="font-sans text-[20px] font-bold tracking-tight text-white">More from Pixelify</h2>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={`${p.lang}-${p.slug}`} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer onTabChange={onTabChange} />
    </div>
  );
}
