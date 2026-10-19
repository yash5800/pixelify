import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  formatDate,
  getAllPosts,
  getPostsPage,
  getReadTime,
  isSupportedLang,
  LANGUAGES,
  langLabel,
  langShort,
  POSTS_PER_PAGE,
  postPath,
} from '../../data/posts';
import { getBlogImageDims } from '../../lib/imageDims';
import type { ViewTab } from '../../types';
import BlogCard from './BlogCard';
import Footer from '../Footer';
import type { Post } from '../../data/posts';

interface BlogListProps {
  onTabChange: (tab: ViewTab) => void;
  /** Pins the language filter for /blogs/<lang>/ index pages. */
  initialLang?: string;
}

function MetaLine({ post, className = '' }: { post: Post; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-muted ${className}`}>
      <span className="text-[#A4D641]">{formatDate(post.date)}</span>
      <span className="text-white/20">/</span>
      <span>{getReadTime(post)} min read</span>
      <span className="text-white/20">/</span>
      <span>{post.author}</span>
    </div>
  );
}

export default function BlogList({ onTabChange, initialLang }: BlogListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const query = searchParams.get('q') || '';
  // Language scope: an index page (e.g. /blogs/fr/) pins the language,
  // otherwise the ?lang= query filters, defaulting to 'all'.
  const rawLang = searchParams.get('lang') || initialLang || 'all';
  const langFilter = rawLang === 'all' || isSupportedLang(rawLang) ? rawLang : 'all';
  const isMixed = langFilter === 'all';
  const [input, setInput] = useState(query);

  useEffect(() => setInput(query), [query]);

  const isSearching = query.trim().length > 0;
  const { posts, page: currentPage, totalPages, totalPosts } = getPostsPage(
    page,
    POSTS_PER_PAGE,
    langFilter
  );

  const results = useMemo(() => {
    if (!isSearching) return [];
    const needle = query.trim().toLowerCase();
    return getAllPosts(langFilter).filter((post) =>
      [post.title, post.description, post.author, post.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [isSearching, query, langFilter]);

  const showFeatured = !isSearching && currentPage === 1 && posts.length > 1;
  const featured = showFeatured ? posts[0] : null;
  const gridPosts = isSearching ? results : showFeatured ? posts.slice(1) : posts;

  useEffect(() => {
    document.title = isSearching
      ? `Search: ${query} · Pixelify Blog`
      : 'Blog & Guides · Pixelify';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) {
      meta.content =
        'In-depth articles about local AI, privacy, background removal, upscaling, WebGPU and how the site runs everything on-device: no cloud, no uploads, no tracking.';
    }
  }, [isSearching, query]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page'); // new scope → back to page 1
    const qs = next.toString();
    router.replace(qs ? `/blogs?${qs}` : '/blogs', { scroll: false });
  };

  const goTo = (n: number) => {
    updateParam('page', String(n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    setInput('');
    updateParam('q', null);
  };

  return (
    <div className="w-full">
      {/* ============================================================
          PAGE HEADER
          ============================================================ */}
      <header className="w-full border-b border-white/10 bg-[#08080B]">
        <div className="w-full px-4 pb-10 pt-8 sm:px-6 lg:px-10">
          <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl">
            Blog &amp; Guides
          </h1>

          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-muted">
            In-depth articles on local AI, privacy-first image processing, background removal,
            super-resolution, WebGPU and how the site runs everything on-device: no cloud, no
            uploads, no tracking.
          </p>

          {/* SEARCH */}
          <div className="relative mt-9 w-full sm:max-w-xl">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                updateParam('q', e.target.value);
              }}
              placeholder="Search articles, tags, topics…"
              aria-label="Search the blog"
              className="w-full rounded-2xl border border-white/10 bg-[#0E0E12] py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/35 focus:border-[#A4D641]/50 focus:outline-none focus:ring-2 focus:ring-[#A4D641]/20"
            />
          </div>

          {/* LANGUAGE FILTER — "All" mixes every language, each chip scopes the feed */}
          <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter articles by language">
            <span className="mr-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Lang
            </span>
            {[{ code: 'all', label: 'All' }, ...LANGUAGES].map((lang) => {
              const active = langFilter === lang.code;
              const count = getAllPosts(lang.code).length;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => updateParam('lang', lang.code === 'all' ? null : lang.code)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                    active
                      ? 'border-transparent bg-[#A4D641] font-bold text-[#0E0E12]'
                      : 'border-white/15 bg-[#121218] text-white/70 hover:border-[#A4D641]/40 hover:text-white'
                  }`}
                >
                  {lang.label}
                  <span className={`font-mono text-[10px] ${active ? 'text-[#0E0E12]/60' : 'text-white/40'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ============================================================
          FEATURED ARTICLE (page 1 only)
          ============================================================ */}
      {featured && (
        <section className="w-full px-4 pt-14 sm:px-6 lg:px-10">
          <Link
            href={postPath(featured)}
            className="group grid overflow-hidden rounded-3xl border border-white/10 bg-[#0B0B0F] transition-all duration-300 hover:border-[#A4D641]/40 lg:grid-cols-[1.15fr_1fr]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-white/5 lg:aspect-auto lg:min-h-[360px]">
              <img
                src={featured.cover}
                alt={featured.coverAlt}
                {...getBlogImageDims(featured.cover)}
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#0B0B0F]" />
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-9">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                    featured.lang === 'en'
                      ? 'bg-white/10 text-white/70'
                      : 'bg-[#A4D641]/15 text-[#A4D641]'
                  }`}
                  title={`${featured.lang.toUpperCase()} article`}
                >
                  {langShort(featured.lang)}
                </span>
                {featured.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-[#A4D641]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#A4D641]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <span className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
                Featured
                {featured.lang !== 'en' && ` · ${langLabel(featured.lang)}`}
              </span>

              <h2 className="mt-3 text-2xl font-black leading-[1.15] tracking-tight text-white sm:text-4xl">
                {featured.title}
              </h2>

              <p className="mt-4 text-[15px] leading-relaxed text-muted line-clamp-3">
                {featured.description}
              </p>

              <MetaLine post={featured} className="mt-6" />

              <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#A4D641]">
                Read article
                <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* ============================================================
          ARTICLE GRID
          ============================================================ */}
      <section className="w-full px-4 pb-6 pt-16 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {isSearching ? 'Search results' : showFeatured ? 'Latest articles' : 'All articles'}
          </h2>

          {isSearching ? (
            <p className="font-mono text-[12px] text-muted">
              {results.length} result{results.length === 1 ? '' : 's'} for “{query}”{' '}
              <button onClick={clearSearch} className="ml-1 text-[#A4D641] underline underline-offset-2 hover:text-white">
                clear
              </button>
            </p>
          ) : (
            <p className="font-mono text-[12px] text-muted">
              {totalPosts} article{totalPosts === 1 ? '' : 's'}
              {!isMixed ? ` · ${langLabel(langFilter)}` : ''} · page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {gridPosts.length > 0 ? (
          <div className="mt-9 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {gridPosts.map((post) => (
              <BlogCard key={`${post.lang}-${post.slug}`} post={post} />
            ))}
          </div>
        ) : (
          <div className="mt-14 pb-6 text-center">
            <p className="text-[15px] text-muted">
              Nothing matched “{query}”. Try “webgpu”, “privacy” or “upscale”.
            </p>
            <button
              onClick={clearSearch}
              className="mt-6 rounded-xl bg-[#A4D641] px-6 py-3 text-sm font-bold text-[#0E0E12] transition hover:bg-[#B9EB50]"
            >
              Show all articles
            </button>
          </div>
        )}
      </section>

      {/* ============================================================
          PAGINATION
          ============================================================ */}
      {!isSearching && totalPosts > POSTS_PER_PAGE && (
        <section className="w-full px-4 pb-16 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-2  pt-10">
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#121218] text-white transition hover:border-[#A4D641]/40 hover:text-[#A4D641] disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white sm:h-11 sm:w-11"
              aria-label="Previous page"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => goTo(n)}                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm transition sm:h-11 sm:w-11 ${
                    n === currentPage
                      ? 'bg-[#A4D641] font-bold text-[#0E0E12]'
                      : 'border border-white/10 bg-[#121218] text-[#BDBDBD] hover:border-[#A4D641]/40 hover:text-white'
                  }`}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#121218] text-white transition hover:border-[#A4D641]/40 hover:text-[#A4D641] disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white sm:h-11 sm:w-11"
              aria-label="Next page"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </section>
      )}

      <div className="h-8" />
      <Footer onTabChange={onTabChange} />
    </div>
  );
}
