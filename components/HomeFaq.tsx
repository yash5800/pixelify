import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'How does Pixelify process images without uploading to cloud servers?',
    a: 'Pixelify executes AI neural networks (Chopper for background removal, Vitality, Pixel-Dance & Alpha-Satoru for upscaling) directly in your browser using ONNX Runtime Web and WebGPU. Model weights are downloaded to your browser cache on first use, after which all tensor math runs locally on your device with 0 bytes uploaded to external servers.',
  },
  {
    q: 'Is Pixelify really 100% free with no watermarks or subscriptions?',
    a: 'Yes, completely free. Because all computation runs locally on your machine, we do not pay expensive cloud GPU compute bills per image. This allows us to offer unlimited high-resolution exports (PNG, WebP, JPEG) without paywalls, subscriptions, credits, or watermarks.',
  },
  {
    q: 'What is the maximum resolution and image size I can upscale?',
    a: 'You can upscale inputs up to 40 MB and export dimensions up to 16,384 × 16,384 pixels (16K Ultra HD), limited only by your computer’s available GPU memory. Standard 2×, 4×, and 8× scale multipliers are supported.',
  },
  {
    q: 'Can I use Pixelify offline without an active internet connection?',
    a: 'Yes! Once a neural model has been loaded once, its weights remain cached securely in your browser storage. You can open Pixelify and remove backgrounds or upscale photos on flights, train commutes, or remote locations without any Wi-Fi or cellular connection.',
  },
  {
    q: 'How does Chopper compare to standard background removers?',
    a: 'Most online tools use basic color-keying or low-resolution segmentation that destroys fine hair, fur, and glass transparency. Chopper performs sub-pixel edge matting, preserving microscopic hair strands, translucent veils, and complex contours with studio-grade precision.',
  },
  {
    q: 'Does Pixelify work on mobile phones and tablets?',
    a: 'Yes. Pixelify is fully responsive and supports mobile Safari and Chrome on iOS and Android. If your mobile device does not support WebGPU, it automatically switches to multi-threaded WebAssembly (WASM SIMD) so processing still works reliably.',
  },
  {
    q: 'Are my private photos and client confidential assets safe?',
    a: '100% safe. You can inspect your browser’s Developer Tools Network tab during processing: no image payloads, no thumbnail previews, and no tracking telemetry ever leave your device. It is completely safe for enterprise client NDAs and confidential photography.',
  },
  {
    q: 'How do I clear downloaded models if I need to free up browser storage?',
    a: 'You can clear cached models at any time by opening the Settings dropdown in the navigation bar (or in the mobile sidebar on phones) and clicking "Clear downloaded models".',
  },
];

export default function HomeFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="w-full max-w-[960px] mx-auto bg-transparent text-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6 relative z-20 my-4 sm:my-8">
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

      {/* Decorative ambient subtle radial glow on dark background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-[#00FF85]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full relative z-10 flex flex-col gap-10 sm:gap-14">
        {/* ========================================================================= */}
        {/* HEADER                                                                    */}
        {/* ========================================================================= */}
        <header className="flex flex-col items-center text-center gap-3 px-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.08]">
            <span className="text-[#00FF85]">F</span>requently{' '}
            <span className="text-[#00FF85]">A</span>sked{' '}
            <span className="text-[#00FF85]">Q</span>uestions
          </h2>
        </header>

        {/* ========================================================================= */}
        {/* ACCORDION LIST: TRANSPARENT DARK THEME ON TOP OF BODY COLOR               */}
        {/* ========================================================================= */}
        <div className="flex flex-col border-t border-white/10">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <article
                key={idx}
                className="border-b border-white/10 transition-colors duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="group flex items-center justify-between gap-4 w-full py-5 sm:py-6 text-left cursor-pointer transition-colors duration-200 select-none"
                >
                  <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                    <span
                      className={`text-xs sm:text-sm font-mono font-bold tracking-wider transition-colors duration-200 ${
                        isOpen ? 'text-[#00FF85]' : 'text-neutral-500 group-hover:text-[#00FF85]'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-base sm:text-lg lg:text-xl font-bold tracking-tight transition-colors duration-200 ${
                        isOpen ? 'text-[#00FF85]' : 'text-white group-hover:text-[#00FF85]'
                      }`}
                    >
                      {item.q}
                    </span>
                  </div>

                  {/* Plus Icon that rotates 135deg on expand */}
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isOpen
                        ? 'rotate-[135deg] bg-[#00FF85] border-[#00FF85] text-neutral-950 shadow-lg shadow-[#00FF85]/20'
                        : 'bg-white/5 border-white/10 text-neutral-300 group-hover:border-[#00FF85] group-hover:bg-[#00FF85]/10 group-hover:text-[#00FF85]'
                    }`}
                  >
                    <Plus size={18} strokeWidth={2.4} />
                  </span>
                </button>

                {/* Animated Answer Body via Grid Rows */}
                <div
                  className="grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
                  style={{
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 pl-7 sm:pl-11 pr-4 sm:pr-8 text-xs sm:text-sm md:text-base leading-relaxed text-neutral-400">
                      {item.a}
                    </p>
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
