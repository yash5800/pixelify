'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

/**
 * Full-bleed "Keep Pixels On Track" showcase: the tow truck carrying the
 * Pixelify wordmark, three tilted feature cards, the 1.2M stat and the
 * rotating studio dial. The 3D work lives in ./truck-scene.
 */
export function TruckHero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let starting = false;

    const start = async () => {
      if (cancelled || cleanup || starting) return;
      starting = true;
      try {
        // Keep three.js out of the home page's initial bundle: the scene is
        // only fetched once the section is within 600px of the viewport.
        const { initTruckScene } = await import('./truck-scene');
        if (cancelled) return;
        cleanup = initTruckScene({ canvas, stage });
      } catch (error) {
        console.error('Truck hero failed to initialise', error);
        stage.classList.add('is-ready');
        const loader = stage.querySelector<HTMLElement>('.stage-loader');
        if (loader) loader.style.display = 'none';
      } finally {
        starting = false;
      }
    };

    // The section sits well below the fold: don't build a WebGL scene (or
    // fetch the model) until it is close to entering the viewport.
    if (typeof IntersectionObserver === 'undefined') {
      start();
      return () => {
        cancelled = true;
        cleanup?.();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(stage);

    return () => {
      cancelled = true;
      observer.disconnect();
      cleanup?.();
    };
  }, []);

  return (
    <section
      className="ts-hero"
      id="truck-hero"
      aria-labelledby="truck-hero-title"
    >
      <div className="ts-copy">
        <h2 className="ts-title" id="truck-hero-title">
          <span className="line">Keep Pixels</span>
          <span className="line">On Track</span>
        </h2>
      </div>

      <aside className="ts-aside">
        <p>
          Take every image the last mile. Upscale to 8×, cut out the subject
          and finish the frame — all on-device.
        </p>
        <Link className="ts-cta" href="/upscaler/">
          Start now
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            aria-hidden="true"
          >
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </Link>
      </aside>

      <div className="ts-stage" id="truck-hero-stage" ref={stageRef}>
        <div className="stage-halo" aria-hidden="true" />
        <div className="stage-loader" aria-hidden="true" />
        <canvas
          id="truck-canvas"
          ref={canvasRef}
          role="img"
          aria-label="Pixelify tow truck carrying the Pixelify wordmark"
        />
        <span className="ts-vertical" aria-hidden="true">
          STUDIO ENGINE
        </span>
      </div>

      <div className="ts-cards">
        <article className="ts-card ts-card--coral">
          <div className="ts-card-head">
            <span className="ts-card-icon">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="6" cy="6" r="2.6" />
                <path d="M8.1 8.1 12 12M20 4 8.2 15.8" />
                <circle cx="6" cy="18" r="2.6" />
                <path d="m14.8 14.8 5.2 5.2" />
              </svg>
            </span>
            <h3>
              Background
              <br />
              Removal
            </h3>
          </div>
          <p>
            Lift any subject out with edge-aware alpha mattes. Hair, fur and
            glass keep their detail — no green screen.
          </p>
          <div className="ts-card-foot">
            <Link className="ts-card-pill" href="/bg_remove/">
              Try cutout
            </Link>
            <span className="ts-card-arrow" aria-hidden="true">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </span>
          </div>
        </article>

        <article className="ts-card ts-card--teal">
          <div className="ts-card-head">
            <span className="ts-card-icon">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
                <path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" />
              </svg>
            </span>
            <h3>8× Upscale</h3>
          </div>
          <p>
            Resolve small frames into print-ready detail with Vitality and
            Pixel-Dance. Fast, tiled and shaped for real photos.
          </p>
          <div className="ts-card-foot">
            <Link className="ts-card-pill" href="/upscaler/">
              Upscale now
            </Link>
            <span className="ts-card-arrow" aria-hidden="true">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </span>
          </div>
        </article>

        <article className="ts-card ts-card--paper">
          <div className="ts-card-head">
            <span className="ts-card-icon">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
                <path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
              </svg>
            </span>
            <h3>
              Studio
              <br />
              Finish
            </h3>
          </div>
          <p>
            Backdrops, shadows, crops and type live in one canvas. Compose the
            frame and export it without leaving the tab.
          </p>
          <div className="ts-card-foot">
            <Link className="ts-card-pill" href="/bg_remove/">
              Open studio
            </Link>
            <span className="ts-card-arrow" aria-hidden="true">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </span>
          </div>
        </article>

        <Link
          className="ts-dial"
          href="/upscaler/"
          aria-label="Explore the studio"
        >
          <svg className="ring-text" viewBox="0 0 114 114" aria-hidden="true">
            <defs>
              <path
                id="truck-hero-dial-path"
                d="M 57,57 m -43,0 a 43,43 0 1,1 86,0 a 43,43 0 1,1 -86,0"
              />
            </defs>
            <text>
              <textPath href="#truck-hero-dial-path" startOffset="0%">
                Explore more · Explore more ·{' '}
              </textPath>
            </text>
          </svg>
          <span className="dial-center">
            <svg
              className="arrow"
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.55"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3.4v16.4M5.9 13.6 12 19.7l6.1-6.1M8.6 3.4h6.8" />
            </svg>
          </span>
        </Link>
      </div>

      <div className="ts-stat">
        <div className="ts-stat-row">
          <span className="ts-stat-number">1.2M</span>
          <span className="ts-avatars" aria-hidden="true">
            <span className="ts-avatar ts-avatar--1">A</span>
            <span className="ts-avatar ts-avatar--2">M</span>
            <span className="ts-avatar ts-avatar--3">J</span>
            <span className="ts-avatar ts-avatar--plus">+</span>
          </span>
        </div>
        <div className="ts-stat-copy">
          <i className="dot" />
          Images delivered at full resolution
        </div>
      </div>
    </section>
  );
}
