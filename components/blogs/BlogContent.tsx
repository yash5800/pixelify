import React from 'react';
import type { Block } from '../../data/posts';
import { getBlogImageDims } from '../../lib/imageDims';

interface BlogContentProps {
  blocks: Block[];
}

/**
 * Article body laid out like the reference (Medium-style editorial):
 *   - Georgia serif 20px/32px body, off-white text
 *   - full-width dividers between sections (hr), no boxed headings
 *   - simple round bullets, plain numbered items
 */
export default function BlogContent({ blocks }: BlogContentProps) {
  return (
    <div className="blog-serif w-full text-[18px] leading-[1.75] text-[#D9D9DE] [&>*:first-child]:mt-0 sm:text-[20px]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'p':
            return (
              <p key={idx} className="mb-8 mt-0">
                {block.text}
              </p>
            );

          case 'h2':
            return (
              <React.Fragment key={idx}>
                <hr className="mt-12 mb-8 border-0 border-t border-white/15" />
                <h2 id={`heading-${idx}`} className="mb-7 scroll-mt-28 text-[26px] font-bold leading-[1.3] tracking-[-0.01em] text-white sm:mb-10 sm:text-[30px]">
                  {block.text}
                </h2>
              </React.Fragment>
            );

          case 'h3':
            return (
              <h3
                key={idx}
                id={`heading-${idx}`}
                className="mb-6 mt-12 scroll-mt-28 text-[20px] font-bold leading-[1.4] text-white sm:text-[22px]"
              >
                {block.text}
              </h3>
            );

          case 'img':
            return (
              <figure key={idx} className="my-12">
                <img src={block.src} alt={block.alt} loading="lazy" {...getBlogImageDims(block.src)} className="h-auto w-full" />
                {block.caption && (
                  <figcaption className="mt-3 text-center text-[13px] leading-relaxed text-white/45">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );

          case 'ul':
            return (
              <ul key={idx} className="mb-8 mt-0 list-disc space-y-5 pl-[26px]">
                {block.items.map((item: string, i: number) => (
                  <li key={i} className="marker:text-[18px] marker:text-white/85">
                    {item}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="mb-8 mt-0 list-decimal space-y-5 pl-[26px]">
                {block.items.map((item: string, i: number) => (
                  <li key={i} className="marker:text-white/85">
                    {item}
                  </li>
                ))}
              </ol>
            );

          case 'quote':
            return (
              <blockquote
                key={idx}
                className="mb-10 mt-12 border-l-[3px] border-white/85 pl-6 text-[20px] font-medium not-italic leading-[1.6] text-white sm:pl-8"
              >
                <p className="m-0">{block.text}</p>
                {block.cite && <footer className="mt-4 font-serif text-[15px] text-white/50">{block.cite}</footer>}
              </blockquote>
            );

          case 'callout':
            return (
              <div
                key={idx}
                className="mb-10 mt-12 rounded-xl border border-white/10 bg-[#141414] px-6 py-6"
              >
                <div className="mb-2 text-[15px] font-bold text-white">{block.title}</div>
                <p className="m-0 leading-[1.7] text-[#D9D9DE]">{block.text}</p>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
