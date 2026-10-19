import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';

/* ============================================================
   BRAND FAQ — PIXELIFY UPSCALER (8K · NO CLOUD)
   Same white/green/black/gray design system as the four
   showcase sections (uc-*). Editorial split header, two-column
   accordion with smooth grid-template-rows expansion.
   ============================================================ */

interface BrandFaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: BrandFaqItem[] = [
  {
    q: 'How does Pixelify upscale to 8K like resolution?',
    a: 'A neural super-resolution network reconstructs your image tile by tile, directly on your GPU. Each pass adds real detail, edges, texture, faces, so a small photo comes out crisp at up to 16,384 × 16,384 pixels. 8K output is one tap, not a render farm.',
  },
  {
    q: 'Is my image uploaded to a cloud server?',
    a: 'Never. The model runs inside your browser tab via WebGPU / WebAssembly. Your photo is processed on your own silicon and stays on your device. There is no queue, no bucket, and no one watching.',
  },
  {
    q: 'Do I need an account or credits?',
    a: 'No sign-up, no email, no credit system. Open the page, drop an image, and upscale as many files as you want. Unlimited runs, forever free.',
  },
  {
    q: 'What can I export, and is there a watermark?',
    a: 'Lossless PNG or WebP at the full upscaled resolution. No watermark, no quality cap, no daily limit. what you see in the preview is exactly what you download.',
  },
  {
    q: 'Will it work on my laptop or phone?',
    a: 'Yes. On devices with WebGPU you get hardware acceleration. Everywhere else the engine falls back to WebAssembly automatically, so the studio works in any modern browser.',
  },
  {
    q: 'How fast is a 4× upscale?',
    a: 'The Turbo engine finishes most images in under a second on a mid-range GPU. The studio-grade Alpha-Satoru pass takes a few seconds for maximum fidelity. Both run locally, so speed depends on your hardware, not a server queue.',
  },
];

export const UpscaleFaq: React.FC = () => {
  const rootRef = useRef<HTMLElement>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            root.classList.add('pb-in');
            io.disconnect();
          }
        });
      },
      { threshold: 0.08 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <section className="uc-faq" ref={rootRef}>
      {/* FAQPage structured data for search engines */}
      <script
        type="application/ld+json"
        id="faq-jsonld-upscaler-ws"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      <div className="uc-glow uc-glow-a" aria-hidden="true" />

      <div className="uc-faq-inner">
        {/* ---------- TOP: centered header ---------- */}
        <header className="uc-faq-head">
          <h2 className="uc-faq-title pb-reveal" style={{ '--rv-i': 1 } as React.CSSProperties}>
           <span className='text-[#00ff85]'>F</span>requently <span className='text-[#00ff85]'>A</span>sked <span className='text-[#00ff85]'>Q</span>uestions
          </h2>
        </header>

        {/* ---------- RIGHT: accordion ---------- */}
        <div className="uc-faq-list">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <article
                key={idx}
                className={`uc-faq-item pb-reveal ${isOpen ? 'is-open' : ''}`}
                style={{ '--rv-i': idx + 2 } as React.CSSProperties}
              >
                <button
                  type="button"
                  className="uc-faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                >
                  <span className="uc-faq-num">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="uc-faq-qtext">{item.q}</span>
                  <span className="uc-faq-plus" aria-hidden="true">
                    <Plus size={16} strokeWidth={2.4} />
                  </span>
                </button>
                <div className="uc-faq-a" role="region">
                  <div className="uc-faq-a-inner">
                    <p>{item.a}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UpscaleFaq;
