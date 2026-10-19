import React from 'react';
import Link from 'next/link';
import { formatDate, getReadTime, langShort, postPath } from '../../data/posts';
import type { Post } from '../../data/posts';
import { getBlogImageDims } from '../../lib/imageDims';

interface BlogCardProps {
  post: Post;
}

export default function BlogCard({ post }: BlogCardProps) {
  const readTime = getReadTime(post);

  return (
    <Link
      href={postPath(post)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] transition-all duration-300 hover:-translate-y-1 hover:border-white/25"
    >
      {/* COVER */}
      <div className="relative aspect-[16/9] overflow-hidden bg-white/5">
        <img
          src={post.cover}
          alt={post.coverAlt}
          loading="lazy"
          {...getBlogImageDims(post.cover)}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>

      {/* BODY */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* LANGUAGE + TAGS — coarse uppercase sans chips */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              post.lang === 'en'
                ? 'border-white/10 bg-white/5 text-white/55'
                : 'border-[#A4D641]/45 bg-[#A4D641]/10 text-[#A4D641]'
            }`}
            title={`${post.lang.toUpperCase()} article`}
          >
            {langShort(post.lang)}
          </span>
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/70"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="mt-4 text-[19px] font-bold leading-snug tracking-tight text-white transition group-hover:text-white/80 sm:text-[21px]">
          {post.title}
        </h3>

        <p className="blog-serif mt-2.5 text-[15px] leading-relaxed text-white/55 line-clamp-2">
          {post.description}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] text-white/55">
          <span>{formatDate(post.date)}</span>
          <span className="text-white/25">·</span>
          <span>{readTime} min read</span>
          <span className="ml-auto text-[#A4D641] transition-transform duration-300 group-hover:translate-x-1.5">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
