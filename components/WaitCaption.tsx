'use client';

import React, { useEffect, useState } from 'react';
import { pickCaption } from '../lib/waitCaptions';
import '@/styles/wait-caption.css';

interface WaitCaptionProps {
  /** Live job progress 0-100 (drives the caption band). */
  percent: number;
  /** True while the AI model itself is downloading (first visit). */
  isDownload?: boolean;
  className?: string;
}

const ROTATE_MS = 4500;

/**
 * Rotating status caption ("Hold tight…", "Almost there…") for processing
 * overlays. Rotates on a timer, band-matched to the live progress so the
 * copy always reflects reality. Fixed height → zero layout shift.
 */
export default function WaitCaption({
  percent,
  isDownload = false,
  className = '',
}: WaitCaptionProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const caption = pickCaption(percent, isDownload, tick);

  return (
    <div className={`h-5 overflow-hidden ${className}`} aria-live="polite" aria-atomic="true">
      <p
        key={`${caption}-${tick}`}
        className="wait-caption-line text-xs font-semibold tracking-wide text-white/55"
      >
        {caption}
      </p>
    </div>
  );
}
