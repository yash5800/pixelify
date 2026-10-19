import React, { useEffect, useRef } from 'react';

/* ============================================================
   SECTION 2 — INFINITE SHOWREEL MARQUEE
   Payooner-style full-bleed gallery ribbon. Duplicated track,
   GPU translate loop, GSAP scroll-velocity skew, pauses on
   hover. Rows tilt in from the sides on first reveal.
   ============================================================ */

interface ReelItem {
  src: string;
  name: string;
  meta: string;
  ratio: string;
  dark?: boolean; // insert a black brand statement card
}

const ROW_A: ReelItem[] = [
  { src: '/showcase/preview/dress_upscaled_4x.png', name: 'Fashion Portrait', meta: 'Editorial', ratio: '365 / 547' },
  { src: '/showcase/preview/pets_upscaled_4x.png', name: 'Pets', meta: 'Fur-level', ratio: '321 / 175' },
  { dark: true, src: '', name: '8K', meta: 'LIKE MAX OUTPUT RESOLUTION', ratio: 'auto' },
  { src: '/showcase/preview/animal_upscaled_4x.png', name: 'Avian portrait', meta: 'Feather-grade', ratio: '2 / 3' },
  { src: '/showcase/preview/handshake_upscaled_4x.png', name: 'Official portrait', meta: 'Photojournalism', ratio: '948 / 533' },
  { src: '/showcase/preview/watch_upscaled_4x.png', name: 'Product', meta: 'Studio-quality', ratio: '3 / 4' },
];

const ROW_B: ReelItem[] = [
  { src: '/showcase/preview/shoes_upscaled_4x.png', name: 'Iconic Poster', meta: 'Print-Ready', ratio: '547 / 365' },
  { dark: true, src: '', name: '4', meta: 'Moves to Finished Cutout', ratio: 'auto' },
  { src: '/showcase/preview/MyHeroAC_upscaled_4x.png', name: 'Anime Art', meta: 'Faces Restored', ratio: '597 / 335' },
  { src: '/showcase/preview/bmw_upscaled_4x.png', name: 'Automotive', meta: 'Detail Recovery', ratio: '9 / 16' },
  { src: '/showcase/preview/pubg_upscaled_4x.png', name: 'Gaming', meta: 'Thumbnail-Ready', ratio: '1000 / 563' },
  { src: '/showcase/preview/demon-slayer_upscaled_4x.png', name: 'Illustration', meta: 'Color Fidelity', ratio: '16 / 9' },
];

/** Duplicate the list so the -50% keyframe loops seamlessly */
const loop = (items: ReelItem[]) => [...items, ...items, ...items];

const Card: React.FC<{ item: ReelItem }> = ({ item }) =>
  item.dark ? (
    <div className="uc-reel-card uc-reel-dark" style={{ aspectRatio: item.ratio }}>
      <span className="uc-reel-dark-big">{item.name}</span>
      <span className="uc-reel-dark-meta">{item.meta}</span>
      <span className="uc-reel-dark-edge" />
    </div>
  ) : (
    <figure className="uc-reel-card" style={{ aspectRatio: item.ratio }}>
      <img src={item.src} alt={item.name} loading="lazy" draggable={false} />
      <figcaption className="uc-reel-caption">
        <span className="uc-reel-name">{item.name}</span>
        <span className="uc-reel-meta">{item.meta}</span>
      </figcaption>
    </figure>
  );

export const UpscaleShowreel: React.FC = () => {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* entrance tilt */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            root.classList.add('pb-in');
            io.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(root);

    /* scroll-velocity skew via GSAP (lib already in project) */
    let raf = 0;
    let lastY = window.scrollY;
    let skew = 0;
    const tick = () => {
      const y = window.scrollY;
      const v = y - lastY;
      lastY = y;
      skew += (Math.max(-9, Math.min(9, v * 0.35)) - skew) * 0.09;
      root.style.setProperty('--reel-skew', `${skew.toFixed(3)}deg`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="uc-reel" ref={rootRef}>
      <header className="uc-reel-head">
        <h2 className="uc-reel-title pb-reveal" style={{ '--rv-i': 1 } as React.CSSProperties}>
          Straight out of the <span className='text-[#00FF85]'>engine.</span>
          <br />
          <em>No retouching. No Photoshop.</em>
        </h2>
      </header>

      <div className="uc-reel-rows pb-reveal" style={{ '--rv-i': 2 } as React.CSSProperties}>
        <div className="uc-reel-row uc-reel-row-a">
          <div className="uc-reel-track">
            {loop(ROW_A).map((item, i) => (
              <Card key={`a-${i}`} item={item} />
            ))}
          </div>
        </div>
        <div className="uc-reel-row uc-reel-row-b">
          <div className="uc-reel-track">
            {loop(ROW_B).map((item, i) => (
              <Card key={`b-${i}`} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* soft vignettes so rows melt into the page */}
      <div className="uc-reel-fade uc-reel-fade-l" aria-hidden="true" />
      <div className="uc-reel-fade uc-reel-fade-r" aria-hidden="true" />
    </section>
  );
};

export default UpscaleShowreel;
