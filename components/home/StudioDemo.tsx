'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ImageCompare } from './ImageCompare';
import { resultFor } from './modelResults';

interface StudioDemoProps {
  /** Scale factor the inspector is set to. */
  scale: number;
  /** Model the inspector has loaded. */
  model: string;
  /** Canvas zoom, as a percentage. */
  zoom?: number;
}

/**
 * The studio canvas as a running demo: the model pass fills a progress rail,
 * then the split reveal settles on the enhanced pixels. Runs once on the way
 * into view, and again whenever the inspector changes the scale or the model,
 * so a settings change reads as a fresh render rather than a dead number.
 */
export function StudioDemo({ scale, model, zoom = 100 }: StudioDemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setProgress(100);
      setDone(true);
      return;
    }

    let raf = 0;
    let started = 0;
    const duration = 1750;

    setProgress(0);
    setDone(false);

    const tick = (now: number) => {
      if (!started) started = now;
      const t = Math.min(1, (now - started) / duration);
      setProgress(Math.round((1 - Math.pow(1 - t, 2)) * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, scale, model]);

  return (
    <div className="fh-studio-demo" ref={ref}>
      <div className="fh-studio-frame">
        <ImageCompare
          before="/home/studio/live-up-before.jpg"
          after={resultFor(model)}
          alt={`A macro portrait of an eye upscaled ${scale}× with ${model} in the Pixelify studio`}
          beforeLabel="Original"
          afterLabel={`${scale}× · ${model}`}
          aspect="756 / 605"
          start={62}
          zoom={zoom}
        />
      </div>

      <div className={`fh-studio-run${done ? ' is-done' : ''}`} aria-hidden="true">
        <span className="fh-studio-run-dot" />
        <span className="fh-studio-run-label">
          {done ? `Enhanced · ${scale}×` : `Enhancing · ${progress}%`}
        </span>
        {done ? (
          <Check size={11} strokeWidth={2.6} />
        ) : (
          <span className="fh-studio-run-rail">
            <i style={{ width: `${progress}%` }} />
          </span>
        )}
      </div>

      <span className="fh-sr" role="status">
        {done ? `Upscale finished at ${scale}× with ${model}` : ''}
      </span>
    </div>
  );
}
