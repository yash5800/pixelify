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
   · Automated Choreography:
     Middle (50%) -> Right (100%) -> Hold -> Left (0%) -> Hold -> Middle (50%) -> Hold -> Next Image!
   · User can grab and drag anytime; auto-rotation resumes smoothly 3s after release
   ============================================================ */
const CompareLens: React.FC<{
  pair: ShowcasePair;
  onNext: () => void;
}> = ({ pair, onNext }) => {
  const [pos, setPos] = useState(50);
  const posRef = useRef(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const isManualRef = useRef(false);
  const resumeTimer = useRef<number | null>(null);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  const animControlRef = useRef<{
    pause: () => void;
    resume: () => void;
  } | null>(null);

  const moveTo = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(100, Math.max(0, pct));
    posRef.current = clamped;
    setPos(clamped);
  }, []);

  /* Automated slider cycle:
     1. Start at 50% (middle) for 0.6s
     2. Glide smoothly from 50% to 100% (right) over 1.8s
     3. Hold at 100% (right) for 1.0s (full original image shown)
     4. Sweep smoothly all over from 100% to 0% (left) over 2.6s
     5. Hold at 0% (left) for 1.0s (full upscaled image shown)
     6. Glide smoothly from 0% back to 50% (middle) over 1.8s
     7. Hold at 50% (middle) for 1.0s
     8. Advance to next image via onNext()!
  */
  useEffect(() => {
    if (prefersReducedMotion()) {
      const timer = window.setTimeout(() => {
        onNextRef.current();
      }, 7000);
      return () => window.clearTimeout(timer);
    }

    let rafId = 0;
    let lastTime = performance.now();
    let stage:
      | 'INITIAL_HOLD'
      | 'TO_RIGHT'
      | 'HOLD_RIGHT'
      | 'TO_LEFT'
      | 'HOLD_LEFT'
      | 'TO_MIDDLE'
      | 'HOLD_MIDDLE'
      | 'RESUME_MIDDLE'
      | 'DONE' = 'INITIAL_HOLD';
    let stageTime = 0;
    let startPos = 50;

    const DURATION_INITIAL_HOLD = 0.8;
    const DURATION_TO_RIGHT = 3.0; // Smooth, gentle glide to right (50% -> 100%)
    const DURATION_HOLD_RIGHT = 1.4; // Pause to inspect full original image
    const DURATION_TO_LEFT = 4.4; // Gentle full-width sweep to left (100% -> 0%)
    const DURATION_HOLD_LEFT = 1.4; // Pause to inspect full 4x upscaled image
    const DURATION_TO_MIDDLE = 3.0; // Gentle return to center (0% -> 50%)
    const DURATION_HOLD_MIDDLE = 1.5; // Pause at split comparison before next image

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    animControlRef.current = {
      pause: () => {
        isManualRef.current = true;
      },
      resume: () => {
        isManualRef.current = false;
        stage = 'RESUME_MIDDLE';
        stageTime = 0;
        startPos = posRef.current;
        lastTime = performance.now();
      },
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (!isManualRef.current) {
        stageTime += dt;

        if (stage === 'INITIAL_HOLD') {
          if (stageTime >= DURATION_INITIAL_HOLD) {
            stage = 'TO_RIGHT';
            stageTime = 0;
            startPos = posRef.current;
          }
        } else if (stage === 'TO_RIGHT') {
          const p = Math.min(1, stageTime / DURATION_TO_RIGHT);
          const current = startPos + (100 - startPos) * easeInOutCubic(p);
          posRef.current = current;
          setPos(current);
          if (p >= 1) {
            posRef.current = 100;
            setPos(100);
            stage = 'HOLD_RIGHT';
            stageTime = 0;
          }
        } else if (stage === 'HOLD_RIGHT') {
          posRef.current = 100;
          setPos(100);
          if (stageTime >= DURATION_HOLD_RIGHT) {
            stage = 'TO_LEFT';
            stageTime = 0;
            startPos = 100;
          }
        } else if (stage === 'TO_LEFT') {
          const p = Math.min(1, stageTime / DURATION_TO_LEFT);
          const current = startPos + (0 - startPos) * easeInOutCubic(p);
          posRef.current = current;
          setPos(current);
          if (p >= 1) {
            posRef.current = 0;
            setPos(0);
            stage = 'HOLD_LEFT';
            stageTime = 0;
          }
        } else if (stage === 'HOLD_LEFT') {
          posRef.current = 0;
          setPos(0);
          if (stageTime >= DURATION_HOLD_LEFT) {
            stage = 'TO_MIDDLE';
            stageTime = 0;
            startPos = 0;
          }
        } else if (stage === 'TO_MIDDLE') {
          const p = Math.min(1, stageTime / DURATION_TO_MIDDLE);
          const current = startPos + (50 - startPos) * easeInOutCubic(p);
          posRef.current = current;
          setPos(current);
          if (p >= 1) {
            posRef.current = 50;
            setPos(50);
            stage = 'HOLD_MIDDLE';
            stageTime = 0;
          }
        } else if (stage === 'HOLD_MIDDLE') {
          posRef.current = 50;
          setPos(50);
          if (stageTime >= DURATION_HOLD_MIDDLE) {
            stage = 'DONE';
            onNextRef.current();
            return;
          }
        } else if (stage === 'RESUME_MIDDLE') {
          const p = Math.min(1, stageTime / 1.8);
          const current = startPos + (50 - startPos) * easeInOutCubic(p);
          posRef.current = current;
          setPos(current);
          if (p >= 1) {
            posRef.current = 50;
            setPos(50);
            stage = 'INITIAL_HOLD';
            stageTime = 0;
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    []
  );

  const handleManualAction = () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    animControlRef.current?.pause();
  };

  const scheduleResume = () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      animControlRef.current?.resume();
    }, 3000);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handleManualAction();
    dragRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers */
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
      className={`uc-lens ${pair.width / pair.height > 1 ? 'is-landscape' : ''}`}
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
          handleManualAction();
          setPos((p) => {
            const next = Math.min(100, Math.max(0, p + (e.key === 'ArrowRight' ? 4 : -4)));
            posRef.current = next;
            return next;
          });
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
      <span className={`uc-tag uc-tag-before ${pos >= 85 ? 'is-active' : ''}`}>BEFORE</span>
      <span className={`uc-tag uc-tag-after ${pos <= 15 ? 'is-active' : ''}`}>AFTER</span>
    </div>
  );
};

/* ============================================================
   SECTION 1 — HERO SHOWCASE
   Auto-cycles through every pair with full slider sweep choreography.
   ============================================================ */
export const UpscaleShowcase: React.FC = () => {
  const rootRef = useReveal<HTMLDivElement>();
  const [active, setActive] = useState(1); // default: Porsche (portrait, dramatic)

  const handleNext = useCallback(() => {
    setActive((a) => (a + 1) % PAIRS.length);
  }, []);

  /* Preload all showcase images so transitions are instant with zero flicker */
  useEffect(() => {
    PAIRS.forEach((p) => {
      const img1 = new Image();
      img1.src = p.before;
      const img2 = new Image();
      img2.src = p.after;
    });
  }, []);

  return (
    <section className="uc-showcase" ref={rootRef}>
      {/* ambient brand glows */}
      <div className="uc-glow uc-glow-a" aria-hidden="true" />
      <div className="uc-glow uc-glow-b" aria-hidden="true" />

      <div className="uc-showcase-inner">
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
            <CompareLens key={PAIRS[active].id} pair={PAIRS[active]} onNext={handleNext} />
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
