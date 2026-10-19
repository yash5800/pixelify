import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, ArrowRight, MoveHorizontal } from 'lucide-react';
import '@/styles/bgremove-sections.css';

/* ============================================================
   BG REMOVE PAGE SECTIONS — dark "studio band" system (bgr-*)
   Editorial display type · ghost outline numerals · rotated
   marquee · cursor-follow previews · viewfinder brackets.
   Palette: white · black · gray · green (#00FF85).
   Sample images are placeholders — swap at the top.
   ============================================================ */

const IMG_S1 = '/bgremove/samples/s1.png';
const IMG_S2 = '/bgremove/samples/s2.png';
const IMG_S3 = '/bgremove/samples/s3.png';
const IMG_PAIR_BEFORE = '/gta6.jpg';   // real before shot
const IMG_PAIR_AFTER = '/gta6.png';    // real transparent cutout
const IMG_CUTOUT_STANDALONE = '/bgremove/watch.png';
const IMG_CUTOUT_STANDALONE2 = '/bgremove/black-widow.png';
const IMG_CUTOUT_STANDALONE3 = '/bgremove/roronova.png';

/* reveal-on-scroll (adds .pb-in once) */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('pb-in');
            io.disconnect();
          }
        });
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

const PlusMark: React.FC<{ style: React.CSSProperties; dim?: boolean }> = ({ style, dim }) => (
  <span className={`bgr-plus ${dim ? 'dim' : ''}`} style={style} aria-hidden="true">+</span>
);

/* ============================================================
   1 — SHOWCASE : editorial split + rotated shots + marquee
   ============================================================ */
const MARQUEE = [
  'Chopper segmentation', 'WebGPU on-device', 'Zero uploads',
  'Hair-level edges', 'Transparent PNG', 'No sign-up', 'Unlimited runs',
];

export const BgShowcase: React.FC = () => {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="bgr-section" ref={ref}>
      <div className="bgr-hero">
        <div className="bgr-hero-copy">
          <span className="bgr-eyebrow pb-reveal">Cutout Studio</span>
          <h2 className="bgr-display pb-reveal" style={{ '--rv-i': '0.06s' } as React.CSSProperties}>
            The background
            <br />
            is <em>gone</em>.<br />
            The subject <span className="grn">stays.</span>
          </h2>
          <p className="bgr-lede pb-reveal" style={{ '--rv-i': '0.12s' } as React.CSSProperties}>
            Powered by a high-precision segmentation network running on your local GPU. Drop a frame and the cutout is done before a cloud service would have finished uploading.          </p>
        </div>

        <div className="bgr-shots">
          <figure className="bgr-shot pb-reveal" style={{ '--rot': '-4deg', left: '0%', top: '8%', '--rv-i': '0.15s', zIndex: 2 } as React.CSSProperties}>
            <img src={IMG_CUTOUT_STANDALONE} alt="Product cutout" loading="lazy" draggable={false} />
            <figcaption>Product · 01</figcaption>
          </figure>
          <figure className="bgr-shot pb-reveal" style={{ '--rot': '2.5deg', left: '30%', top: '0%', '--rv-i': '0.24s', zIndex: 3 } as React.CSSProperties}>
            <img src={IMG_CUTOUT_STANDALONE2} alt="Portrait cutout" loading="lazy" draggable={false} />
            <figcaption>Portrait · 02</figcaption>
          </figure>
          <figure className="bgr-shot pb-reveal" style={{ '--rot': '5deg', left: '58%', top: '16%', '--rv-i': '0.33s', zIndex: 1 } as React.CSSProperties}>
            <img src={IMG_CUTOUT_STANDALONE3} alt="Studio cutout" loading="lazy" draggable={false} />
            <figcaption>Studio · 03</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};


/* ============================================================
   3 — PIPELINE : sticky crosshair + ghost-number steps
   ============================================================ */
const Crosshair: React.FC = () => (
  <svg className="bgr-cross" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="1" />
    <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
    <line x1="50" y1="0" x2="50" y2="16" stroke="currentColor" strokeWidth="1.4" />
    <line x1="50" y1="84" x2="50" y2="100" stroke="currentColor" strokeWidth="1.4" />
    <line x1="0" y1="50" x2="16" y2="50" stroke="currentColor" strokeWidth="1.4" />
    <line x1="84" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="50" cy="50" r="2.6" fill="currentColor" />
  </svg>
);

export const BgPipeline: React.FC = () => {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="bgr-section" ref={ref}>
      <div className="bgr-pipe">
        <div className="bgr-pipe-left">
          <span className="bgr-eyebrow pb-reveal">The pipeline</span>
          <h2 className="bgr-display pb-reveal" style={{ '--rv-i': '0.06s' } as React.CSSProperties}>
            Three moves.
            <br />
            <em>Absolute privacy.</em>
          </h2>
          <p className="bgr-lede pb-reveal" style={{ '--rv-i': '0.12s' } as React.CSSProperties}>
            From drag-and-drop to finished cutout without a single byte leaving the machine.
          </p>
          <div className="bgr-cross-wrap pb-reveal" style={{ '--rv-i': '0.18s' } as React.CSSProperties} aria-hidden="true">
            <Crosshair />
            <span className="bgr-cross-hint">subject locked · on-device</span>
          </div>
        </div>

        <div className="bgr-pipe-right">
          <article className="bgr-step pb-reveal" style={{ '--rv-i': '0.08s' } as React.CSSProperties}>
            <span className="bgr-ghost">01</span>
            <div>
              <span className="bgr-step-k">Drop</span>
              <h3>Land the image</h3>
              <p>PNG, JPG or WebP up to 20 MB by dragging it in, pasting with Ctrl+V, or pick a file. Processing begins the moment it arrives.</p>
            </div>
          </article>

          <article className="bgr-step pb-reveal" style={{ '--rv-i': '0.16s' } as React.CSSProperties}>
            <span className="bgr-ghost">02</span>
            <div>
              <span className="bgr-step-k">Segment</span>
              <h3>Neural separation</h3>
              <p>Chopper runs directly on your hardware, leveraging WebGPU when available and WebAssembly everywhere else. Hair, fur and glass edges included.</p>
            </div>
          </article>

          <article className="bgr-step pb-reveal" style={{ '--rv-i': '0.24s' } as React.CSSProperties}>
            <span className="bgr-ghost">03</span>
            <div>
              <span className="bgr-step-k">Ship</span>
              <h3>Refine & export</h3>
              <p>Brush edges back, swap backgrounds, and add shadows. Then, save as a transparent PNG, WebP, or JPG in a single click.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

/* ============================================================
   4 — PRECISION : viewfinder lens + counter stats
   ============================================================ */
const Lens: React.FC<{ before: string; after: string }> = ({ before, after }) => {
  const [cut, setCut] = useState(50);
  const [ar, setAr] = useState(4 / 3);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  /* frame follows the image's real aspect ratio so nothing is cropped */
  const measure = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) setAr(img.naturalWidth / img.naturalHeight);
  };

  const move = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    setCut(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <div className="bgr-vf">
      <i /><i /><i /><i />
      <div
        className="bgr-lens"
        ref={frameRef}
        style={{ '--bgr-ar': ar } as React.CSSProperties}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && move(e.clientX)}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <img src={after} alt="Cutout result" loading="lazy" draggable={false} onLoad={measure} />
        <div className="bgr-lens-before" style={{ clipPath: `inset(0 calc(100% - ${cut}%) 0 0)` }}>
          <img src={before} alt="Original" loading="lazy" draggable={false} />
        </div>
        <span className="bgr-lens-handle" style={{ left: `${cut}%` }}>
          <span className="bgr-lens-knob"><MoveHorizontal size={15} strokeWidth={2.4} /></span>
        </span>
        <span className="bgr-lens-rec">Live · On-device</span>
        <span className="bgr-lens-tag is-before">Original</span>
        <span className="bgr-lens-tag is-after">Cutout</span>
      </div>
    </div>
  );
};

export const BgPrecision: React.FC = () => {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="bgr-section" ref={ref}>
      <PlusMark style={{ top: '4%', right: '2%' }} />
      <PlusMark style={{ bottom: '8%', left: '0%' }} dim />

      <div className="bgr-precision">
        <div className="pb-reveal" style={{ '--rv-i': '0.08s' } as React.CSSProperties}>
          <Lens before={IMG_PAIR_BEFORE} after={IMG_PAIR_AFTER} />
        </div>

        <div>
          <span className="bgr-eyebrow pb-reveal">Edge precision</span>
          <h2 className="bgr-display pb-reveal" style={{ '--rv-i': '0.06s', fontSize: 'clamp(34px, 4.4vw, 56px)' } as React.CSSProperties}>
            Zoom in.
            <br />
            <em>Judge yourself.</em>
          </h2>
          <p className="bgr-lede pb-reveal" style={{ '--rv-i': '0.12s', fontSize: 13.5 } as React.CSSProperties}>
            Drag the slider across the frame, the left side shows the original shot, the right shows the isolated subject. Your export keeps exactly what you see here.
          </p>

          <div className="bgr-stats">
            <div className="bgr-stat pb-reveal" style={{ '--rv-i': '0.16s' } as React.CSSProperties}>
              <b>40<small>MB</small></b>
              <span>Model cached after first run</span>
            </div>
            <div className="bgr-stat pb-reveal" style={{ '--rv-i': '0.22s' } as React.CSSProperties}>
              <b>15<small>MB</small></b>
              <span>Maximum upload per image</span>
            </div>
            <div className="bgr-stat pb-reveal" style={{ '--rv-i': '0.28s' } as React.CSSProperties}>
              <b>3<small>FMT</small></b>
              <span>PNG · WebP · JPG exports</span>
            </div>
            <div className="bgr-stat pb-reveal" style={{ '--rv-i': '0.34s' } as React.CSSProperties}>
              <b>100<small>%</small></b>
              <span>Processed on your hardware</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


/* ============================================================
   2 — SAMPLES : index list + cursor-follow preview
   ============================================================ */
export interface SampleDef {
  src: string;
  name: string;
  tag: string;
}

const SAMPLES: SampleDef[] = [
  { src: IMG_S1, name: 'Street Portrait', tag: 'Portrait' },
  { src: IMG_S2, name: 'Studio Subject', tag: 'Studio' },
  { src: IMG_S3, name: 'Wildlife Shot', tag: 'Wildlife' },
];

export const BgSampleGallery: React.FC<{ onLoadSample: (src: string, name: string) => void }> = ({ onLoadSample }) => {
  const ref = useReveal<HTMLElement>();
  const previewRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const showPreview = useCallback((src: string, x: number, y: number) => {
    const el = previewRef.current;
    if (!el) return;
    if (previewImgRef.current) previewImgRef.current.src = src;
    el.style.transform = `translate(${x - 125}px, ${y - 300}px)`;
    el.classList.add('is-on');
  }, []);

  const hidePreview = useCallback(() => {
    previewRef.current?.classList.remove('is-on');
  }, []);

  /* keep the preview honest when the page scrolls under a stationary cursor */
  useEffect(() => {
    window.addEventListener('scroll', hidePreview, { passive: true });
    return () => window.removeEventListener('scroll', hidePreview);
  }, [hidePreview]);

  return (
    <section className="bgr-section" ref={ref}>
      <PlusMark style={{ top: '10%', right: '4%' }} />

      <div className="bgr-samples-head">
        <div>
          <span className="bgr-eyebrow pb-reveal">Try it live</span>
          <h2 className="bgr-display pb-reveal" style={{ '--rv-i': '0.06s' } as React.CSSProperties}>
            Pick a frame.
            <br />
            <em>Watch it split.</em>
          </h2>
        </div>
        <p className="bgr-lede pb-reveal" style={{ '--rv-i': '0.12s', maxWidth: 380 } as React.CSSProperties}>
          Each row runs the exact network you'll use on your own files. Click an option below to start the cutout instantly on the canvas.
        </p>
      </div>

      <div className="bgr-index" onMouseLeave={hidePreview}>
        {SAMPLES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            className="bgr-row pb-reveal"
            style={{ '--rv-i': `${0.1 + i * 0.07}s` } as React.CSSProperties}
            onClick={() => { hidePreview(); onLoadSample(s.src, s.name); }}
            onMouseMove={(e) => showPreview(s.src, e.clientX, e.clientY)}
          >
            <span className="bgr-ghost">{String(i + 1).padStart(2, '0')}</span>
            <span className="bgr-row-name">{s.name}</span>
            <img className="bgr-row-thumb" src={s.src} alt="" loading="lazy" draggable={false} />
            <span className="bgr-row-tag">{s.tag}</span>
            <span className="bgr-row-go"><ArrowRight size={15} strokeWidth={2.4} /></span>
          </button>
        ))}
      </div>

      {/* cursor-follow preview */}
      <div className="bgr-preview" ref={previewRef} aria-hidden="true">
        <img ref={previewImgRef} alt="" draggable={false} />
      </div>
    </section>
  );
};


/* ============================================================
   5 — FAQ : identical design system to the upscaler FAQ
   (reuses the globally-bundled uc-faq classes)
   ============================================================ */
const FAQ_ITEMS = [
  {
    q: 'How do I remove a background for free?',
    a: 'Open the Background Remover, drag your image into the upload area, and the AI cutout starts automatically. When it finishes, download the transparent PNG, no sign-up, no credits, no watermark.',
  },
  {
    q: 'Are my images uploaded to a server?',
    a: 'No. The Chopper segmentation model runs directly inside your browser through Transformers.js with WebGPU or WebAssembly. Your photos never leave your device, which makes it safe for private or client work.',
  },
  {
    q: 'Which formats can I use and export?',
    a: 'Upload PNG, JPG, and WebP up to 20 MB. Export as transparent PNG for cutouts, WebP for the web with alpha kept, or JPG flattened onto a solid background.',
  },
  {
    q: 'Can I replace the removed background?',
    a: 'Yes. Once the cutout is done, open the Background tab to place your subject on a transparent canvas, a solid or gradient color, or your own uploaded photo, then download the composite in one click.',
  },
  {
    q: 'Does it handle hair, fur and glass?',
    a: 'The bilateral-reference architecture is trained specifically on fine boundaries, hair strands, fur, and semi-transparent edges survive far better than with classic color-key tools.',
  },
  {
    q: 'Why is the first image slower?',
    a: 'The roughly 40 MB model downloads to your browser cache on first use. Every image after that reuses it, so processing drops to a couple of seconds on most hardware.',
  },
];

export const BgFaq: React.FC = () => {
  const ref = useReveal<HTMLElement>();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="uc-faq" ref={ref}>
      <script
        type="application/ld+json"
        id="faq-jsonld-bg-remove"
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

      <div className="uc-faq-inner">
        <header className="uc-faq-head">
          <h2 className="uc-faq-title pb-reveal" style={{ '--rv-i': 1 } as React.CSSProperties}>
           <span className='text-[#00ff85]'>F</span>requently <span className='text-[#00ff85]'>A</span>sked <span className='text-[#00ff85]'>Q</span>uestions
          </h2>
        </header>

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

export default { BgShowcase, BgPipeline, BgPrecision, BgSampleGallery, BgFaq };
