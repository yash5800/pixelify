'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { ImageCompare } from './ImageCompare';
import { resultFor } from './modelResults';

type BrushTool = 'erase' | 'restore';

interface CutoutDemoProps {
  model?: string;
  zoom?: number;
  /** Move keeps the comparison slider; erase / restore paint the alpha matte. */
  tool?: 'move' | BrushTool;
  /** Brush diameter in screen pixels. */
  brushSize?: number;
  /** Bump this to throw away every painted stroke. */
  resetToken?: number;
  /** Fired after a stroke lands, so the panel can update its status. */
  onEdited?: () => void;
}

const MAX_CANVAS_EDGE = 1600;
const STAMP_SIZE = 128;

/** A soft round stamp: opaque core, feathered rim. */
function makeStamp() {
  const canvas = document.createElement('canvas');
  canvas.width = STAMP_SIZE;
  canvas.height = STAMP_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const c = STAMP_SIZE / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.72, 'rgba(255, 255, 255, 0.98)');
  gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.55)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STAMP_SIZE, STAMP_SIZE);
  return canvas;
}

/**
 * Live cutout frame. In Move mode the original photo holds the left of the
 * divider and the transparent result sits on the checkerboard to its right,
 * so dragging the split peels the background off in either direction.
 *
 * Erase and Restore switch the frame to the matte itself: the cutout is drawn
 * onto a canvas and a second canvas holds its alpha. Strokes clear that alpha
 * (erase) or paint it back from the untouched cutout (restore), so the tools
 * change real pixels instead of only changing a label.
 */
export function CutoutDemo({
  model = 'Chopper',
  zoom = 100,
  tool = 'move',
  brushSize = 44,
  resetToken = 0,
  onEdited,
}: CutoutDemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  const cutoutRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const stampRef = useRef<HTMLCanvasElement | null>(null);
  const loadedModelRef = useRef<string | null>(null);
  const paintingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const composeFrame = useRef(0);
  const editedUrlRef = useRef<string | null>(null);

  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [edited, setEdited] = useState(false);
  const [editedSrc, setEditedSrc] = useState<string | null>(null);

  const brushMode = tool === 'erase' || tool === 'restore';

  // The callbacks read these during a stroke; keeping them in refs means a
  // tool change never leaves a stale closure on the canvas handlers.
  const toolRef = useRef(tool);
  const brushRef = useRef(brushSize);
  const editedRef = useRef(onEdited);
  toolRef.current = tool;
  brushRef.current = brushSize;
  editedRef.current = onEdited;

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setReady(true);
      return;
    }
    setReady(false);
    const timer = window.setTimeout(() => setReady(true), 1650);
    return () => window.clearTimeout(timer);
  }, [inView, reduce, model]);

  /** Draw the cutout through the current alpha mask. */
  const compose = useCallback(() => {
    const canvas = canvasRef.current;
    const cutout = cutoutRef.current;
    const mask = maskRef.current;
    if (!canvas || !cutout || !mask) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cutout, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const scheduleCompose = useCallback(() => {
    if (composeFrame.current) return;
    composeFrame.current = requestAnimationFrame(() => {
      composeFrame.current = 0;
      compose();
    });
  }, [compose]);

  const clearEditedImage = useCallback(() => {
    if (editedUrlRef.current) {
      URL.revokeObjectURL(editedUrlRef.current);
      editedUrlRef.current = null;
    }
    setEditedSrc(null);
  }, []);

  // The compare view reads this snapshot, so edits survive a trip through
  // Move and back without re-encoding the whole matte on every stroke.
  const captureEditedImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (editedUrlRef.current) URL.revokeObjectURL(editedUrlRef.current);
      const url = URL.createObjectURL(blob);
      editedUrlRef.current = url;
      setEditedSrc(url);
    }, 'image/png');
  }, []);

  // Build the offscreen matte the first time a brush is used, then keep it
  // alive so Move can compare against the edited result. The studio demo
  // never leaves Move, so it never pays for these canvases.
  useEffect(() => {
    if (!brushMode) return;
    if (loadedModelRef.current === model) return;

    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';

    img.onload = () => {
      if (cancelled) return;
      const edge = Math.max(img.naturalWidth, img.naturalHeight) || 1;
      const scale = Math.min(1, MAX_CANVAS_EDGE / edge);
      const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

      const cutout = document.createElement('canvas');
      cutout.width = width;
      cutout.height = height;
      const cutoutCtx = cutout.getContext('2d');
      if (!cutoutCtx) return;
      cutoutCtx.drawImage(img, 0, 0, width, height);
      cutoutRef.current = cutout;

      const mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      const maskCtx = mask.getContext('2d');
      if (!maskCtx) return;
      maskCtx.fillStyle = '#ffffff';
      maskCtx.fillRect(0, 0, width, height);
      maskRef.current = mask;

      stampRef.current = makeStamp();
      loadedModelRef.current = model;
      clearEditedImage();
      setEdited(false);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        compose();
      }
    };

    img.src = resultFor(model, true);
    return () => {
      cancelled = true;
    };
  }, [brushMode, model, compose, clearEditedImage]);

  // Size the visible canvas when the brush view mounts, then show the matte.
  useEffect(() => {
    if (!brushMode) return;
    const canvas = canvasRef.current;
    const cutout = cutoutRef.current;
    if (!canvas || !cutout) return;
    if (canvas.width !== cutout.width || canvas.height !== cutout.height) {
      canvas.width = cutout.width;
      canvas.height = cutout.height;
    }
    compose();
  }, [brushMode, compose]);

  // Reset restores the untouched matte.
  useEffect(() => {
    if (!resetToken) return;
    const mask = maskRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, mask.width, mask.height);
    clearEditedImage();
    setEdited(false);
    compose();
  }, [resetToken, compose, clearEditedImage]);

  useEffect(
    () => () => {
      cancelAnimationFrame(composeFrame.current);
      if (editedUrlRef.current) URL.revokeObjectURL(editedUrlRef.current);
    },
    []
  );

  /** Stamp the brush along the segment since the previous point. */
  const strokeTo = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const mask = maskRef.current;
    const stamp = stampRef.current;
    if (!canvas || !frame || !mask || !stamp) return;

    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ctx = mask.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const radius = Math.max(1, (brushRef.current / 2) * scaleX);
    const erase = toolRef.current === 'erase';

    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    const last = lastPointRef.current;

    const stampAt = (px: number, py: number) => {
      ctx.drawImage(stamp, px - radius, py - radius, radius * 2, radius * 2);
    };

    if (!last) {
      stampAt(x, y);
    } else {
      const dx = x - last.x;
      const dy = y - last.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.max(1, radius * 0.28);
      const count = Math.max(1, Math.ceil(distance / step));
      for (let i = 1; i <= count; i += 1) {
        stampAt(last.x + (dx * i) / count, last.y + (dy * i) / count);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    lastPointRef.current = { x, y };
    scheduleCompose();
  };

  const moveRing = (clientX: number, clientY: number) => {
    const frame = frameRef.current;
    const ring = ringRef.current;
    if (!frame || !ring) return;
    const rect = frame.getBoundingClientRect();
    ring.style.transform = `translate3d(${clientX - rect.left}px, ${clientY - rect.top}px, 0) translate(-50%, -50%)`;
    ring.style.opacity = '1';
  };

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    paintingRef.current = true;
    lastPointRef.current = null;
    moveRing(event.clientX, event.clientY);
    strokeTo(event.clientX, event.clientY);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    moveRing(event.clientX, event.clientY);
    if (paintingRef.current) strokeTo(event.clientX, event.clientY);
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!paintingRef.current) return;
    paintingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setEdited(true);
    editedRef.current?.();
  };

  return (
    <div className="fh-cutout-live" ref={ref}>
      {brushMode ? (
        <div className="fh-cutout-edit" ref={frameRef}>
          <canvas
            ref={canvasRef}
            className="fh-cutout-canvas"
            aria-label={`Editable alpha matte for ${model}. Drag to ${tool} with the brush.`}
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerEnter={(event) => moveRing(event.clientX, event.clientY)}
            onPointerLeave={() => {
              if (paintingRef.current) return;
              if (ringRef.current) ringRef.current.style.opacity = '0';
            }}
          />
          <span className="fh-compare-tag fh-compare-tag--after" aria-hidden="true">
            Cutout · {model}
          </span>
          <span
            ref={ringRef}
            className={`fh-brush-ring ${tool === 'erase' ? 'is-erase' : 'is-restore'}`}
            style={{ width: brushSize, height: brushSize }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <ImageCompare
          before="/home/studio/live-cut-before.jpg"
          after={resultFor(model, true)}
          alt={`Studio headphones cut out on a transparent background by ${model}`}
          beforeLabel="Original"
          afterLabel={`Cutout · ${model}`}
          aspect="3 / 2"
          checker
          start={30}
          zoom={zoom}
        />
      )}

      <span className={`fh-demo-status${ready ? ' is-done' : ''}`} aria-hidden="true">
        <i />
        {edited
          ? 'Alpha matte edited'
          : ready
            ? 'Alpha matte ready'
            : `Cutting out · ${model}`}
      </span>

      <span className="fh-sr" role="status">
        {ready ? `${model} finished the cutout — alpha matte ready` : ''}
        {edited ? ' Matte edits applied on-device.' : ''}
      </span>
    </div>
  );
}
