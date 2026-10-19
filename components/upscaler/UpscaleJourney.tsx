import React, { useEffect, useRef, useState } from 'react';
import { MousePointer2, Upload, Download, Cpu } from 'lucide-react';

/* ============================================================
   SECTION 4 — THE JOURNEY (sticky scroll)
   Pinned visual column + step list that swaps the preview as
   you scroll. Before/after + progress readouts update per step.
   ============================================================ */

interface JourneyStep {
  id: string;
  k: string; // "01"
  icon: React.ReactNode;
  title: string;
  desc: string;
  img: string;
  imgAlt: string;
  readout: string; // top-right status chip
  meter: { label: string; pct: number }[];
}

const STEPS: JourneyStep[] = [
  {
    id: 'upload',
    k: '01',
    icon: <Upload size={16} strokeWidth={2.2} />,
    title: 'Drop anything',
    desc: 'Drag a PNG, JPG or WebP into the studio or paste straight from the clipboard with Ctrl+V. Up to 15 MB, zero setup.',
    img: '/showcase/upscaleorg/gtaonline.png',
    imgAlt: 'Original porsche photo being dropped in',
    readout: 'READY',
    meter: [
      { label: 'Input locked', pct: 100 },
      { label: 'Model warm-up', pct: 12 },
    ],
  },
  {
    id: 'choose',
    k: '02',
    icon: <MousePointer2 size={16} strokeWidth={2.2} />,
    title: 'Pick your model',
    desc: 'Vitality for instant passes, or Pixel-Dance & Alpha-Satoru for maximum fidelity, then dial in denoise, sharpen and HDR per image.',
    img: '/showcase/preview/gtaonline_upscaled_4x.png',
    imgAlt: 'Porsche mid-enhancement',
    readout: 'TUNING',
    meter: [
      { label: 'Input locked', pct: 100 },
      { label: 'Model warm-up', pct: 100 },
      { label: 'Pass selected · 4×', pct: 64 },
    ],
  },
  {
    id: 'process',
    k: '03',
    icon: <Cpu size={16} strokeWidth={2.2} />,
    title: 'Watch it work',
    desc: 'Tiles stream through the GPU with live progress. Your photo never touches a server, the network runs in this tab.',
    img: '/showcase/preview/gtaonline_upscaled_4x.png',
    imgAlt: 'Porsche processing on device',
    readout: 'INFERENCE',
    meter: [
      { label: 'Input locked', pct: 100 },
      { label: 'Model warm-up', pct: 100 },
      { label: 'Pass selected · 4×', pct: 100 },
      { label: 'WebGPU tiles', pct: 78 },
    ],
  },
  {
    id: 'export',
    k: '04',
    icon: <Download size={16} strokeWidth={2.2} />,
    title: 'Export clean',
    desc: 'Lossless PNG or WebP at full 4× resolution, no watermark, no sign-up, straight to your drive.',
    img: '/showcase/preview/gtaonline_upscaled_4x.png',
    imgAlt: 'Porsche fully upscaled 4x',
    readout: 'DONE ✓',
    meter: [
      { label: 'Input locked', pct: 100 },
      { label: 'Model warm-up', pct: 100 },
      { label: 'Pass selected · 4×', pct: 100 },
      { label: 'WebGPU tiles', pct: 100 },
    ],
  },
];

export const UpscaleJourney: React.FC = () => {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  /* --- section reveal: the title uses .pb-reveal (opacity 0 until
     .pb-in lands on this root). Without this the headline stays
     invisible forever — every sibling section adds its own pb-in. --- */
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
      /* threshold 0: this section is very tall (sticky pin + four
         steps), so a percentage threshold would only fire after
         hundreds of px of scrolling — reveal as soon as the top of
         the section (where the title lives) enters the viewport */
      { threshold: 0, rootMargin: '0px 0px -12% 0px' }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* --- step sync while scrolling the steps column --- */
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.uj-step'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx ?? 0);
            setActive(idx);
          }
        });
      },
      /* upper-middle band: each step activates as it rises past
         60% of the viewport, so the LAST step is active well
         before the sticky pin runs out of travel */
      /* mid band: step activates as it crosses 55% of the viewport
         height — early enough that the pinned visual (which holds
         until the steps column ends) shows every step, incl. 04 */
      { rootMargin: '-25% 0px -25% 0px' }
    );
    sections.forEach((s) => io.observe(s));

    return () => io.disconnect();
  }, []);

  const step = STEPS[active];

  return (
    <section className="uj" ref={rootRef}>
      <div className="uj-inner">
        {/* ------------- HEADER ------------- */}
        <header className="uj-head">
          <h2 className="uj-title pb-reveal" style={{ '--rv-i': 1 } as React.CSSProperties}>
            Four moves.
            <br />
            <em>Studio output.</em>
          </h2>
        </header>

        <div className="uj-grid">
          {/* ------------- LEFT: pinned visual ------------- */}
          <div className="uj-pin">
            <div className="uj-pin-frame" data-step={step.id}>
              <img key={step.id} src={step.img} alt={step.imgAlt} className="uj-pin-img" draggable={false} />
              <span className="uj-pin-chip">{step.readout}</span>
              <span className="uj-pin-k">{step.k}</span>
            </div>

            {/* live meters */}
            <div className="uj-meters">
              {step.meter.map((m) => (
                <div key={m.label} className="uj-meter">
                  <span className="uj-meter-label">{m.label}</span>
                  <span className="uj-meter-track">
                    <span className="uj-meter-fill" style={{ width: `${m.pct}%` }} />
                  </span>
                  <span className="uj-meter-pct">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ------------- RIGHT: steps ------------- */}
          <div className="uj-steps">
            {STEPS.map((s, i) => (
              <article
                key={s.id}
                data-idx={i}
                className={`uj-step ${i === active ? 'is-active' : ''}`}
              >
                <div className="uj-step-rail">
                  <span className="uj-step-node">{s.icon}</span>
                  <span className="uj-step-line" />
                </div>
                <div className="uj-step-body">
                  <span className="uj-step-k">{s.k}</span>
                  <h3 className="uj-step-title">{s.title}</h3>
                  <p className="uj-step-desc">{s.desc}</p>
                </div>
                <span className="uj-step-ghost" aria-hidden="true">
                  {s.k}
                </span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UpscaleJourney;
