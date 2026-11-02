'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'How does Pixelify process images without uploading to cloud servers?',
    a: 'The AI runs right in your browser using WebGPU and ONNX Runtime, so your images stay on your device—not on someone else’s server.',
  },
  {
    q: 'Is Pixelify really 100% free with no watermarks or subscriptions?',
    a: 'Yes—no subscriptions, credits, watermarks, or surprise paywalls; just upload, edit, and download.',
  },
  {
    q: 'What is the maximum resolution and image size I can upscale?',
    a: 'Upscale images up to 40 MB and 16K resolution (16,384 × 16,384 px)—your device’s memory is the only real boss here.',
  },
  {
    q: 'Can I use Pixelify offline without an active internet connection?',
    a: 'Once the AI models are cached, you can process images offline—perfect for flights, commutes, or Wi-Fi that decided to take a day off.',
  },
  {
    q: 'How does Chopper compare to standard background removers?',
    a: 'Chopper is designed to preserve tricky details like hair, fur, and fine edges, so your subject doesn’t end up looking like it lost a fight with scissors.',
  },
  {
    q: 'Does Pixelify work on mobile phones and tablets?',
    a: 'Yes! Pixelify works on supported mobile browsers too, using WebGPU or a compatible WASM fallback when available.',
  },
  {
    q: 'Are my private photos and client confidential assets safe?',
    a: 'Your images stay on your device during processing; even our site-visit counter has no business knowing what you’re editing.',
  },
  {
    q: 'How do I clear downloaded models if I need to free up browser storage?',
    a: 'Open Settings and select “Clear downloaded models”—a quick cleanup without having to clear your entire browser cache.',
  },
];

export default function HomeFaq() {
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
    <section className="uc-faq uc-faq--home" id="home-faq" ref={rootRef}>
      {/* FAQPage structured data for search engines */}
      <script
        type="application/ld+json"
        id="faq-jsonld-home"
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
            <span className="text-[#00ff85]">F</span>requently{' '}
            <span className="text-[#00ff85]">A</span>sked{' '}
            <span className="text-[#00ff85]">Q</span>uestions
          </h2>
        </header>

        {/* ---------- ACCORDION LIST ---------- */}
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
}
