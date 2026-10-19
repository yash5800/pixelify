import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ============================================================
   BRAND COLOR SYSTEM  (white · green · black · gray)
   ============================================================ */

/* ============================================================
   SHOWCASE DATA — real result pairs from /public/showcase
   ============================================================ */
interface ShowcasePair {
  id: string;
  name: string;
  category: string;
  before: string;
  after: string;
  aspect: string; // CSS aspect-ratio for cards
  width: number;
  height: number;
}

const PAIRS: ShowcasePair[] = [
  {
    id: 'animegirl',
    name: 'Anime Portrait',
    category: 'Illustration',
    before: '/showcase/upscaleorg/animegirl.png',
    after: '/showcase/upscaled/animegirl_upscaled_4x.png',
    aspect: '375 / 533',
    width: 375,
    height: 533,
  },
  {
    id: 'porsche',
    name: 'Porsche 911',
    category: 'Automotive',
    before: '/showcase/upscaleorg/porsche.png',
    after: '/showcase/upscaled/porsche_upscaled_4x.png',
    aspect: '452 / 678',
    width: 452,
    height: 678,
  },
  {
    id: 'iconic',
    name: 'Iconic Poster',
    category: 'Print Media',
    before: '/showcase/upscaleorg/iconic.png',
    after: '/showcase/upscaled/iconic_upscaled_4x.png',
    aspect: '236 / 470',
    width: 236,
    height: 470,
  },
  {
    id: 'tony',
    name: 'Cinematic Frame',
    category: 'Film Stills',
    before: '/showcase/upscaleorg/tony_iconic.png',
    after: '/showcase/upscaled/tony_iconic_upscaled_4x.png',
    aspect: '580 / 344',
    width: 580,
    height: 344,
  },
  {
    id: 'luffy',
    name: 'Anime Wide Shot',
    category: 'Illustration',
    before: '/showcase/upscaleorg/luffy.png',
    after: '/showcase/upscaled/luffy_upscaled_4x.png',
    aspect: '738 / 414',
    width: 738,
    height: 414,
  },
];

const HERO_STATS = [
  { value: '8x', label: 'Resolution Gain' },
  { value: '100%', label: 'Private · On-Device' },
  { value: '0', label: 'Bytes Leaving Machine' },
];

const CYCLE_MS = 6500;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   REVEAL-ON-SCROLL HOOK (IntersectionObserver, zero deps)
   Adds `pb-in` to the section root; child `.pb-reveal` /
   `.uc-float-card` elements animate via CSS stagger vars.
   ============================================================ */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('pb-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ============================================================
   INTERACTIVE BEFORE / AFTER LENS
   · Pointer-capture dragging (mouse + touch, can't get stuck)
   · Full 0–100 range
   · Auto-sweeps back & forth until the user grabs it,
     then resumes a few seconds after they let go
   ============================================================ */
const CompareLens: React.FC<{ pair: ShowcasePair }> = ({ pair }) => {
  const [pos, setPos] = useState(50);
  const [auto, setAuto] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const dirRef = useRef<1 | -1>(1);
  const resumeTimer = useRef<number | null>(null);

  const moveTo = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  /* auto sweep: slow ping-pong across the FULL 0–100 range,
     with a deliberate hold at each edge before reversing */
  useEffect(() => {
    if (!auto || prefersReducedMotion()) return;
    let raf = 0;
    let last = performance.now();
    let hold = 0; // seconds remaining to pause at an edge
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (hold > 0) {
        hold -= dt;
      } else {
        setPos((p) => {
          let next = p + dirRef.current * dt * 9;
          if (next >= 100) {
            next = 100;
            dirRef.current = -1;
            hold = 1.4; // pause fully on the "after" side
          } else if (next <= 0) {
            next = 0;
            dirRef.current = 1;
            hold = 1.4; // pause fully on the "before" side
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    []
  );

  const stopAuto = () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    setAuto(false);
  };

  const scheduleResume = () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setAuto(true), 4000);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stopAuto();
    dragRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers — window listeners below still work */
    }
    moveTo(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) moveTo(e.clientX);
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = false;
    scheduleResume();
  };

  return (
    <div
      ref={frameRef}
      className="uc-lens"
      style={{ aspectRatio: pair.aspect, '--ar': pair.width / pair.height } as React.CSSProperties}
      role="slider"
      tabIndex={0}
      aria-label="Compare original and upscaled image"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          stopAuto();
          setPos((p) =>
            Math.min(100, Math.max(0, p + (e.key === 'ArrowRight' ? 4 : -4)))
          );
          scheduleResume();
        }
      }}
    >
      {/* AFTER (upscaled 4×) fills the frame */}
      <img src={pair.after} alt={`${pair.name} upscaled 4x`} draggable={false} className="uc-lens-img" />
      {/* BEFORE (original) clipped to the left of the handle */}
      <div className="uc-lens-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={pair.before} alt={`${pair.name} original`} draggable={false} className="uc-lens-img" />
      </div>

      {/* divider */}
      <div className="uc-lens-divider" style={{ left: `${pos}%` }} />

      {/* handle (decoration — drag anywhere on the frame) */}
      <span className="uc-lens-handle" style={{ left: `${pos}%` }} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 7l-5 5 5 5" />
          <path d="M16 7l5 5-5 5" />
        </svg>
      </span>

      {/* corner tags */}
      <span className="uc-tag uc-tag-before">BEFORE</span>
      <span className="uc-tag uc-tag-after">AFTER</span>
    </div>
  );
};

/* ============================================================
   SECTION 1 — HERO SHOWCASE
   Auto-cycles through every pair; hovering anything pauses it.
   ============================================================ */
export const UpscaleShowcase: React.FC = () => {
  const rootRef = useReveal<HTMLDivElement>();
  const [active, setActive] = useState(1); // default: Porsche (portrait, dramatic)
  const [paused, setPaused] = useState(false);

  /* auto-change the showcased image every few seconds */
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % PAIRS.length),
      CYCLE_MS
    );
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <section className="uc-showcase" ref={rootRef}>
      {/* ambient brand glows */}
      <div className="uc-glow uc-glow-a" aria-hidden="true" />
      <div className="uc-glow uc-glow-b" aria-hidden="true" />

      <div
        className="uc-showcase-inner"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* ---------------- LEFT: floating gallery ---------------- */}
        <div className="uc-gallery uc-gallery-left" aria-hidden="true">
          {PAIRS.slice(0, 2).map((p, i) => (
            <figure
              key={p.id}
              className={`uc-float-card uc-fc-${i + 1} ${p.width / p.height > 1 ? 'is-landscape' : 'is-portrait'
                } ${active === i ? 'is-active' : ''}`}
              style={
                {
                  '--fc-delay': `${i * 0.14}s`,
                  '--card-ar': p.aspect,
                } as React.CSSProperties
              }
              onClick={() => setActive(i)}
            >
              <img src={p.after} alt="" loading="lazy" draggable={false} />
              <figcaption className="uc-fc-caption">
                <span className="uc-fc-name">{p.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* ---------------- CENTER: copy + lens ---------------- */}
        <div className="uc-showcase-center">

          <h1 className="uc-title pb-reveal" style={{ '--rv-i': 1 } as React.CSSProperties}>
            Every pixel,
            <br />
            <em>re-imagined.</em>
          </h1>

          <p className="uc-subtitle pb-reveal" style={{ '--rv-i': 2 } as React.CSSProperties}>
            Experience real 8x upscaling, rendered live on-device.
            Slide the lens to compare: the untouched original on the left, and Pixelify’s single-pass result on the right.
          </p>

          <div className="pb-reveal uc-lens-wrap" style={{ '--rv-i': 3 } as React.CSSProperties}>
            <CompareLens key={PAIRS[active].id} pair={PAIRS[active]} />
          </div>

          {/* stat pills */}
          <div className="uc-stats pb-reveal" style={{ '--rv-i': 4 } as React.CSSProperties}>
            {HERO_STATS.map((s) => (
              <div key={s.label} className="uc-stat">
                <span className="uc-stat-value">{s.value}</span>
                <span className="uc-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- RIGHT: floating gallery ---------------- */}
        <div className="uc-gallery uc-gallery-right" aria-hidden="true">
          {PAIRS.slice(2).map((p, i) => (
            <figure
              key={p.id}
              className={`uc-float-card uc-fc-r${i + 1} ${p.width / p.height > 1 ? 'is-landscape' : 'is-portrait'
                } ${active === i + 2 ? 'is-active' : ''}`}
              style={
                {
                  '--fc-delay': `${0.2 + i * 0.14}s`,
                  '--card-ar': p.aspect,
                } as React.CSSProperties
              }
              onClick={() => setActive(i + 2)}
            >
              <img src={p.after} alt="" loading="lazy" draggable={false} />
              <figcaption className="uc-fc-caption">
                <span className="uc-fc-name">{p.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* live index dots */}
      <div className="uc-dots" role="tablist" aria-label="Showcase images">
        {PAIRS.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={active === i}
            aria-label={`Show ${p.name}`}
            className={`uc-dot ${active === i ? 'is-on' : ''}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
};

export default UpscaleShowcase;
