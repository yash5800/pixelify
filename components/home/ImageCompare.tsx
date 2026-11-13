'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

interface ImageCompareProps {
  before: string;
  after: string;
  alt: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Aspect ratio of the frame, as a CSS value (default 5 / 4). */
  aspect?: string;
  /** Transparent result sits on the studio checkerboard. */
  checker?: boolean;
  /** Where the reveal starts when it is not driven by the viewport. */
  start?: number;
  /** Sweep the divider once when the frame scrolls into view. */
  auto?: boolean;
  /** Canvas zoom, as a percentage. Scales the layers, not the divider. */
  zoom?: number;
  className?: string;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const MIN = 3;
const MAX = 97;

/**
 * A live before / after frame: the enhanced layer is clipped at the divider,
 * so the split is real pixels, not a montage. Sweeps itself into view once,
 * then answers the pointer, the arrow keys, Home / End and Page Up / Down.
 *
 * The divider is painted straight onto the DOM while it moves: a drag is a
 * pointer-move write, not a React render per frame, so it stays at 60fps on
 * a trackpad and the `aria-valuenow` the assistive tech reads matches the
 * pixels exactly.
 */
export function ImageCompare({
  before,
  after,
  alt,
  beforeLabel = 'Original',
  afterLabel = 'Enhanced',
  aspect = '5 / 4',
  checker = false,
  start = 58,
  auto = true,
  zoom = 100,
  className = '',
}: ImageCompareProps) {
  const root = useRef<HTMLDivElement>(null);
  const topLayer = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const dragging = useRef(false);
  const pos = useRef(Math.min(MAX, Math.max(MIN, start)));
  const inView = useInView(root, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  const played = useRef(false);
  const [held, setHeld] = useState(false);
  const hintId = useId();

  /** Write the split to the DOM, and keep the slider value in sync with it. */
  const paint = useCallback((next: number) => {
    const value = Math.min(MAX, Math.max(MIN, next));
    pos.current = value;
    if (topLayer.current) {
      topLayer.current.style.clipPath = `inset(0 0 0 ${value}%)`;
    }
    if (line.current) {
      line.current.style.left = `${value}%`;
    }
    const el = root.current;
    if (el) {
      el.setAttribute('aria-valuenow', String(Math.round(value)));
      el.setAttribute('aria-valuetext', `${Math.round(value)}% original, ${Math.round(100 - value)}% ${afterLabel.toLowerCase()}`);
    }
  }, [afterLabel]);

  // First paint, and whenever the requested start changes.
  useEffect(() => {
    paint(start);
  }, [paint, start]);

  // One calm sweep the first time the frame is visible: the divider travels
  // from the left edge to just past centre, then stays where it landed.
  useEffect(() => {
    if (!inView || played.current) return;
    played.current = true;

    if (reduce || !auto) {
      paint(start);
      return;
    }

    const from = 10;
    const to = start;
    const duration = 1500;
    let began = 0;

    const tick = (now: number) => {
      if (!began) began = now;
      const t = Math.min(1, (now - began) / duration);
      paint(from + (to - from) * easeOut(t));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    paint(from);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [inView, reduce, auto, start, paint]);

  const moveTo = useCallback((clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    paint(((clientX - box.left) / box.width) * 100);
  }, [paint]);

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
      setHeld(false);
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  return (
    <div
      ref={root}
      className={`fh-compare${held ? ' is-held' : ''}${checker ? ' fh-compare--checker' : ''} ${className}`}
      style={{
        aspectRatio: aspect,
        ...(zoom !== 100 ? ({ '--fh-zoom': String(zoom / 100) } as CSSProperties) : {}),
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        dragging.current = true;
        setHeld(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) moveTo(event.clientX);
      }}
      role="slider"
      tabIndex={0}
      aria-label={`${alt}. Drag, or use the arrow keys, to compare the original and the result`}
      aria-describedby={hintId}
      aria-orientation="horizontal"
      aria-valuenow={Math.round(pos.current)}
      aria-valuemin={0}
      aria-valuemax={100}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 12 : 4;
        let next: number | null = null;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = pos.current - step;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = pos.current + step;
        if (event.key === 'PageDown') next = pos.current - 10;
        if (event.key === 'PageUp') next = pos.current + 10;
        if (event.key === 'Home') next = MIN;
        if (event.key === 'End') next = MAX;
        if (next === null) return;
        event.preventDefault();
        cancelAnimationFrame(frame.current);
        paint(next);
      }}
    >
      <img
        className="fh-compare-base"
        src={before}
        alt=""
        role="presentation"
        loading="lazy"
        draggable={false}
      />

      <div ref={topLayer} className="fh-compare-top">
        <img src={after} alt="" role="presentation" loading="lazy" draggable={false} />
      </div>

      <span className="fh-compare-tag fh-compare-tag--before" aria-hidden="true">
        {beforeLabel}
      </span>
      <span className="fh-compare-tag fh-compare-tag--after" aria-hidden="true">
        {afterLabel}
      </span>

      <span ref={line} className="fh-compare-line" aria-hidden="true">
        <span className="fh-compare-grip">
          <i />
          <i />
        </span>
      </span>

      <span id={hintId} className="fh-sr">
        {beforeLabel} on the left, {afterLabel.toLowerCase()} on the right.
      </span>
    </div>
  );
}
