import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface HomeDemoProps {
  onSelectSample: (
    sampleUrl: string,
    type: 'upscale' | 'bg_remove'
  ) => void | Promise<void>;
}

const SAMPLES = [
  {
    id: 's1',
    name: 'Sports',
    src: '/home/ronaldo.jpg',
    type: 'bg_remove' as const,
    description: 'Extract subject with sub-pixel edge detection',
  },
  {
    id: 's2',
    name: 'Anime Art',
    src: '/home/one-piece.jpg',
    type: 'bg_remove' as const,
    description: '4x upscale with micro-texture enhancement',
  },
  {
    id: 's3',
    name: 'Ocean Life',
    src: '/home/turtle.jpeg',
    type: 'upscale' as const,
    description: 'Clean product cutout for commercial use',
  },
  {
    id: 's4',
    name: 'Old Photo',
    src: '/home/mt-king.webp',
    type: 'upscale' as const,
    description: 'Clean product cutout for commercial use',
  },
];

const FEATURES_TABS = [
  {
    id: 'f1',
    title: 'Background Remover',
    subtitle:
      'Isolate subjects with sub-pixel precision around transparent objects and fine hair strands.',
    badge: 'Chopper AI',
    detailTitle: 'Chopper Neural Segmentation',
    detailDesc:
      'Dual-path vision transformers generate smooth alpha matte masks directly in browser memory.',
  },
  {
    id: 'f2',
    title: 'Background Remover',
    subtitle:
      'Isolate subjects with sub-pixel precision around transparent objects and fine hair strands.',
    badge: 'Chopper AI',
    detailTitle: 'Chopper Neural Segmentation',
    detailDesc:
      'Dual-path vision transformers generate smooth alpha matte masks directly in browser memory.',
  },
  {
    id: 'f3',
    title: 'AI Upscaler',
    subtitle:
      'Reconstruct high-frequency textures and crisp edges up to 8K like resolution without artifacts.',
    badge: '8x Factor',
    detailTitle: 'Vitality, Pixel-Dance & Alpha-Satoru',
    detailDesc:
      'Direct ONNX Runtime Web execution utilizing WebGPU shaders for hardware-accelerated tensor math.',
  },
  {
    id: 'f4',
    title: 'AI Upscaler',
    subtitle:
      'Zero cloud servers, zero external data uploads. Your images never leave your computer.',
    badge: 'Local WASM',
    detailTitle: 'Air-Gapped Client Security',
    detailDesc:
      'Complete offline capability powered by WASM SIMD and WebGPU.',
  },
];

export default function HomeDemo({
  onSelectSample,
}: HomeDemoProps) {
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);

  const handleSelect = async (sample: (typeof SAMPLES)[0]) => {
    if (loadingSampleId) return;
    setLoadingSampleId(sample.id);
    try {
      await onSelectSample(sample.src, sample.type);
    } catch {
      setLoadingSampleId(null);
    }
  };

  return (
    <section
      className="
        relative left-1/2 z-20
        my-6 w-screen max-w-[100vw]
        -translate-x-1/2
        overflow-visible
        px-3
        sm:my-10 sm:px-6
        lg:px-8
        xl:px-10
      "
    >
      {/* FULL-WIDTH SECTION CONTENT */}
      <div className="mx-auto flex w-full max-w-none flex-col gap-6 sm:gap-8">
        {/* SECTION HEADING */}
        <div className="w-full">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#A4D641]">
            Instant Demos
          </span>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
            Try sample assets with a single click
          </h2>
        </div>

        {/* MAIN GRID BACKGROUND */}
        <div
          className="
            w-full rounded-lg border border-white/5
            bg-[#233447] p-3 shadow-2xl
            sm:rounded-xl sm:p-6
            lg:p-7
            xl:p-8
          "
        >
          {/* RESPONSIVE FOUR-COLUMN GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {SAMPLES.map((sample, idx) => {
              const feature = FEATURES_TABS[idx];
              const popupOpensLeft = idx >= 2;

              return (
                <motion.div
                  key={sample.id}
                  initial={{
                    opacity: 0,
                    y: 25,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.2,
                  }}
                  transition={{
                    delay: idx * 0.08,
                    duration: 0.45,
                    ease: 'easeOut',
                  }}
                  whileHover={loadingSampleId ? undefined : {
                    y: -6,
                  }}
                  onClick={() => handleSelect(sample)}
                  className={`
                    group relative z-10
                    flex flex-col
                    overflow-visible
                    transition-opacity duration-200
                    ${
                      loadingSampleId
                        ? loadingSampleId === sample.id
                          ? 'cursor-wait opacity-100'
                          : 'pointer-events-none cursor-not-allowed opacity-50'
                        : 'cursor-pointer lg:hover:z-[100]'
                    }
                  `}
                >
                  {/* SAMPLE CARD */}
                  <div
                    className="
                      relative z-10 flex flex-col
                      overflow-hidden rounded-md
                      border border-white/5
                      bg-[#1B2838] shadow-lg
                      transition-all duration-300
                      hover:border-[#A4D641]/50
                      hover:shadow-2xl
                      sm:rounded-lg
                    "
                  >
                    {/* IMAGE PREVIEW */}
                    <div
                      className="
                        relative aspect-[4/3] w-full
                        overflow-hidden bg-[#101822]
                        lg:aspect-[5/4]
                        xl:aspect-[4/3]
                      "
                    >
                      <img
                        src={sample.src}
                        alt={sample.name}
                        loading="lazy"
                        className="
                          h-full w-full object-cover
                          transition-transform duration-500 ease-out
                          group-hover:scale-[1.05]
                        "
                      />

                      {/* SUBTLE HOVER OVERLAY */}
                      <div
                        className="
                          pointer-events-none absolute inset-0
                          bg-black/0 transition-colors duration-300
                          group-hover:bg-black/10
                        "
                      />
                    </div>

                    {/* CARD FOOTER */}
                    <div
                      className="
                        flex min-h-[50px] items-center
                        justify-between bg-[#1B2838]
                        px-3 py-2
                        sm:px-4
                        lg:min-h-[56px]
                      "
                    >
                      {/* TOOL TYPE: MOBILE AND TABLET */}
                      <span
                        className="
                          font-mono text-[11px] font-semibold
                          text-neutral-400
                          lg:hidden
                          sm:text-xs
                        "
                      >
                        {sample.type === 'bg_remove'
                          ? 'BG REMOVE'
                          : 'AI UPSCALE'}
                      </span>

                      <div className="ml-auto flex items-center">
                        {/* SAMPLE NAME */}
                        <div
                          className="
                            flex min-h-[36px] max-w-[190px]
                            items-center justify-center
                            truncate rounded-sm
                            bg-[#A4D641] px-3
                            text-xs font-bold text-[#101820]
                            transition-colors duration-300
                            group-hover:bg-[#B9EB50]
                            sm:min-h-[38px] sm:px-4 sm:text-sm
                            lg:max-w-none
                          "
                        >
                          <span className="truncate">
                            {loadingSampleId === sample.id ? 'Loading…' : sample.name}
                          </span>
                        </div>

                        {/* ARROW OR SPINNER */}
                        <div
                          className="
                            flex h-[36px] w-8 shrink-0
                            items-center justify-center
                            text-white transition-colors duration-300
                            group-hover:text-[#A4D641]
                            sm:h-[38px] sm:w-10
                          "
                        >
                          {loadingSampleId === sample.id ? (
                            <Loader2 size={18} className="animate-spin text-[#A4D641]" />
                          ) : (
                            <span
                              className="
                                text-lg leading-none
                                transition-transform duration-300
                                group-hover:translate-x-1
                                sm:text-xl
                              "
                            >
                              →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DESKTOP HOVER DESCRIPTION */}
                  <div
                    className={`
                      pointer-events-none invisible absolute
                      top-0 z-50 hidden w-[min(380px,calc(100vw-32px))]
                      translate-y-2 scale-[0.98]
                      opacity-0 transition-all duration-200 ease-out
                      group-hover:visible group-hover:translate-y-0
                      group-hover:scale-100 group-hover:opacity-100
                      lg:block
                      ${
                        popupOpensLeft
                          ? 'right-[calc(100%-1px)]'
                          : 'left-[calc(100%-1px)]'
                      }
                    `}
                  >
                    {/* POPUP PANEL */}
                    <div
                      className="
                        relative min-h-[260px]
                        rounded-sm border border-white/10
                        bg-[#3B4A5A] px-5 py-4
                        text-white shadow-2xl
                      "
                    >
                      {/* POPUP ARROW */}
                      <div
                        className={`
                          absolute top-[45px] h-0 w-0
                          border-y-[14px] border-y-transparent
                          ${
                            popupOpensLeft
                              ? 'left-full border-l-[14px] border-l-[#3B4A5A]'
                              : 'right-full border-r-[14px] border-r-[#3B4A5A]'
                          }
                        `}
                      />

                      {/* FEATURE TITLE */}
                      <h3 className="pr-2 text-[17px] font-medium leading-tight text-white">
                        {feature.title}
                      </h3>

                      {/* FEATURE BADGE */}
                      <div className="mt-2">
                        <span
                          className="
                            inline-flex items-center rounded-sm
                            border border-white/5 bg-[#263746]
                            px-2 py-1 font-mono text-[11px]
                            font-semibold text-[#BFD0DE]
                          "
                        >
                          {feature.badge}
                        </span>
                      </div>

                      {/* DESCRIPTION */}
                      <p className="mt-3 text-[13px] leading-[1.55] text-[#D6DDE4]">
                        {feature.subtitle}
                      </p>

                      {/* TECHNICAL DETAILS */}
                      <div
                        className="
                          mt-4 border-l-2 border-[#A4D641]
                          bg-[#293A4A] px-3 py-3
                        "
                      >
                        <p className="text-[12px] font-semibold text-white">
                          {feature.detailTitle}
                        </p>

                        <p className="mt-1 text-[12px] leading-[1.5] text-[#B8C5D0]">
                          {feature.detailDesc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
