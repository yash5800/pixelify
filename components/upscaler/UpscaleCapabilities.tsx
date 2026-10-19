import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Lock,
  Gauge,
  Layers,
  Wand2,
  ArrowUpRight,
} from 'lucide-react';

/* ============================================================
   SECTION 3 — CAPABILITIES BENTO
   "Core HR solutions" reference: big centered statement, then
   a masonry bento of cards that mix real imagery + live
   micro-visuals instead of emoji grids.
   ============================================================ */

/* ---------- count-up hook (fires when visible) ---------- */
function useCountUp(target: number, duration = 1400) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return { ref, val };
}

const Stat: React.FC<{ target: number; suffix?: string; label: string }> = ({ target, suffix = '', label }) => {
  const { ref, val } = useCountUp(target);
  return (
    <span ref={ref} className="uc-bento-stat">
      <b>{val.toLocaleString()}{suffix}</b> {label}
    </span>
  );
};

/* ---------- fake enhancement "panel" micro-visual ---------- */
const EnhancePanel: React.FC = () => (
  <div className="uc-ep" aria-hidden="true">
    <div className="uc-ep-row"><span className="uc-ep-dot" /><span className="uc-ep-bar" style={{ width: '72%' }} /></div>
    <div className="uc-ep-row"><span className="uc-ep-dot uc-ep-dot-g" /><span className="uc-ep-bar" style={{ width: '46%' }} /></div>
    <div className="uc-ep-row"><span className="uc-ep-dot" /><span className="uc-ep-bar" style={{ width: '88%' }} /></div>
    <div className="uc-ep-slider">
      <span className="uc-ep-slider-dot" />
    </div>
  </div>
);

/* ---------- fake privacy chip micro-visual ---------- */
const PrivacyChip: React.FC = () => (
  <div className="uc-pc" aria-hidden="true">
    <div className="uc-pc-wave" />
    <span className="uc-pc-lock"><Lock size={15} strokeWidth={2.2} /></span>
    <span className="uc-pc-caption">this device only</span>
  </div>
);

interface BentoCell {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  span: string; // grid-area classes
  visual: React.ReactNode;
}

const CELLS: BentoCell[] = [
  {
    id: 'detail',
    icon: <Sparkles size={18} strokeWidth={2} />,
    title: 'Generative Detail Engine',
    desc: 'Edge-aware reconstruction intelligently restores fine textures, skin details, and metallic reflections instead of stretching pixels.',
    span: 'uc-b-cell-a',
    visual: (
      <div className="uc-bento-visual">
        <img src="/showcase/preview/aniimo_upscaled_4x.png" alt="Porsche upscaled with generative detail" loading="lazy" draggable={false} />
      </div>
    ),
  },
  {
    id: 'speed',
    icon: <Gauge size={18} strokeWidth={2} />,
    title: 'WebGPU Fast Path',
    desc: 'Hardware-accelerated inference with WASM fallback. Turbo passes finish in milliseconds.',
    span: 'uc-b-cell-b',
    visual: <Stat target={30} suffix="ms" label="turbo pass on a mid-range GPU" />,
  },
  {
    id: 'faces',
    icon: <Wand2 size={18} strokeWidth={2} />,
    title: 'Face Restoration',
    desc: 'Portrait-aware pass revives eyes, lashes and skin tones destroyed by compression.',
    span: 'uc-b-cell-c',
    visual: (
      <div className="uc-bento-visual uc-bento-visual-tall">
        <img src="/showcase/preview/magicEM_upscaled_4x.png" alt="Portrait with restored facial detail" loading="lazy" draggable={false} />
      </div>
    ),
  },
  {
    id: 'privacy',
    icon: <Lock size={18} strokeWidth={2} />,
    title: 'Nothing Leaves the Browser',
    desc: 'Frames are processed on your silicon. No queue, no account, no watermark.',
    span: 'uc-b-cell-d',
    visual: <PrivacyChip />,
  },
  {
    id: 'scale',
    icon: <Layers size={18} strokeWidth={2} />,
    title: '2× to 16K Output',
    desc: 'Tile-and-stitch pipeline scales anything up to 16,384px without crashing the tab.',
    span: 'uc-b-cell-e',
    visual: <Stat target={16384} label="px maximum canvas edge" />,
  },
  {
    id: 'control',
    icon: <ArrowUpRight size={18} strokeWidth={2} />,
    title: 'Per-Image Control',
    desc: 'Model, scale, denoise, sharpen and HDR tuned independently for every file in the batch.',
    span: 'uc-b-cell-f',
    visual: <EnhancePanel />,
  },
];

export const UpscaleCapabilities: React.FC = () => {
  const rootRef = useRef<HTMLElement>(null);

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
      { threshold: 0.1 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <section className="uc-capab" ref={rootRef}>
      <div className="uc-glow uc-glow-c" aria-hidden="true" />

      <header className="uc-capab-head">
        <h2 className="uc-capab-title pb-reveal" style={{ '--rv-i': 1 } as React.CSSProperties}>
          A studio-grade <span className='text-[#00FF88]'>toolkit,</span>
          <br />
          <em>hiding in your browser tab.</em>
        </h2>
        <p className="uc-capab-sub pb-reveal" style={{ '--rv-i': 2 } as React.CSSProperties}>
          A powerful suite of object isolation and resolution enhancement engines running entirely inside this tab.
        </p>
      </header>

      <div className="uc-bento">
        {CELLS.map((cell, i) => (
          <article
            key={cell.id}
            className={`uc-bento-card ${cell.span} pb-reveal`}
            style={{ '--rv-i': i + 1 } as React.CSSProperties}
          >
            <div className="uc-bento-top">
              <span className="uc-bento-icon">{cell.icon}</span>
              <h3>{cell.title}</h3>
            </div>
            <p className="uc-bento-desc">{cell.desc}</p>
            <div className="uc-bento-viz">{cell.visual}</div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default UpscaleCapabilities;
