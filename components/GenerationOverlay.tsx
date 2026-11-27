"use client";

/* ============================================================
   GENERATION OVERLAY
   The "generating" churn shown over the stage while the
   background remover / upscaler runs:

   - busy:            the pixel-grid churn drifts over the stage
   - re-run:          the previous result sits blurred underneath
                      while the new one computes
   - result lands:    the churn fades out immediately (no hold, no
                      dissolve) so the real result rendered beneath —
                      and its before/after slider — is usable at once

   This used to be a WebGL (img-fx) shader. A full-stage fragment
   program redrawn every frame underneath the app's backdrop-blur
   surfaces was heavy enough to stutter the whole page on integrated
   GPUs, so the effect is now pure CSS: compositor-driven transforms
   and static gradients. No canvas, no shader, no GPU readback, and
   nothing to download — it paints on the very first frame of a run.

   A status card (bottom-right) shows the live phase label, the
   progress stat and a slim progress track. The accent shifts from
   amber (weights / session prep) to blue (inference) so the two
   phases read differently at a glance.
   ============================================================ */

import React, { useCallback, useEffect, useRef, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** CSS-only generation effect. Always available and always the one rendered:
    a dark stage, slow drifting glow blobs, a panning grid and a soft sweep —
    all animated with `transform`/`opacity` so the browser can keep them on the
    compositor instead of repainting the stage every frame. */
function GenerationFallback({
  previousUrl,
  reducedMotion,
}: {
  previousUrl: string | null;
  reducedMotion: boolean;
}) {
  return (
    <div
      className="generation-fallback absolute inset-0 overflow-hidden"
      data-motion={reducedMotion ? "off" : "on"}
      aria-hidden="true"
    >
      {previousUrl && (
        <img
          src={previousUrl}
          alt=""
          className="generation-fallback-prev"
          draggable={false}
        />
      )}

      <span className="generation-fallback-blob generation-fallback-blob-a" />
      <span className="generation-fallback-blob generation-fallback-blob-b" />
      <span className="generation-fallback-blob generation-fallback-blob-c" />
      <span className="generation-fallback-grid" />
      <span className="generation-fallback-sweep" />
      <span className="generation-fallback-vignette" />
    </div>
  );
}

/** Cross-fade duration on completion — kept in sync with the `data-fading`
    animation in app.css, so the parent unmounts the overlay exactly when the
    fade has finished. Parents can import it to arm their own release backstop. */
export const GENERATION_FADE_MS = 180;
const OVERLAY_FADE_MS = GENERATION_FADE_MS;

export interface GenerationOverlayProps {
  /** Image pool before the final result exists: [previousResult] on re-runs. */
  images: string[];
  /** Final result — the churn fades out the moment this arrives. */
  revealUrl: string | null;
  /** Status text for the bottom-right card. */
  label: string;
  /** 0–100 progress; null/undefined renders a label-only card. */
  percent?: number | null;
  /** Accent for the card: `loading` = weights / session prep (amber),
      `processing` = inference / encode (blue). Defaults to processing. */
  phase?: "loading" | "processing";
  /** Corner radius the effect is clipped to (the stage's radius). */
  borderRadius?: number;
  /** Block pointer interaction with the stage beneath (pan / zoom / wheel). */
  blockPointerEvents?: boolean;
  /** Called once after the fade-out so the parent can unmount the overlay. */
  onFinished: () => void;
}

export default function GenerationOverlay({
  images,
  revealUrl,
  label,
  percent,
  phase = "processing",
  borderRadius = 16,
  blockPointerEvents = false,
  onFinished,
}: GenerationOverlayProps) {
  const reducedMotion = useReducedMotion();

  const onFinishedRef = useRef(onFinished);
  const finishedRef = useRef(false);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  /* Derived, not state: the fade must start in the very commit that carries the
     result, without waiting for a second render pass to flip a flag. */
  const [fadeOnDemand, setFadeOnDemand] = useState(false);
  const fading = fadeOnDemand || revealUrl != null;

  onFinishedRef.current = onFinished;

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);

  // Clear every pending timer on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, []);

  /* Result is ready: fade the churn out right away — no dissolve, no hold.
     The stage beneath already renders the real result (and its before/after
     slider), so every extra beat is time the user stares at a stale frame. */
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFadeOnDemand(true);
    after(OVERLAY_FADE_MS, () => onFinishedRef.current());
  }, [after]);

  /* The result landed (or a new run started): close the churn immediately. */
  useEffect(() => {
    if (!revealUrl) {
      // A new run started — allow a fresh fade for the next result.
      finishedRef.current = false;
      setFadeOnDemand(false);
      return;
    }
    if (finishedRef.current) return;
    finish();
  }, [revealUrl, finish]);

  const previousUrl = images[0] ?? null;
  const progressValue = percent == null
    ? null
    : Math.min(100, Math.max(0, Math.round(percent)));

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      data-fading={fading ? "true" : "false"}
      className={`generation-overlay absolute inset-0 z-30 overflow-hidden ${
        blockPointerEvents ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={{ borderRadius }}
      onPointerDown={blockPointerEvents ? stop : undefined}
      onPointerMove={blockPointerEvents ? stop : undefined}
      onPointerUp={blockPointerEvents ? stop : undefined}
      onWheel={blockPointerEvents ? stop : undefined}
    >
      <GenerationFallback
        previousUrl={previousUrl}
        reducedMotion={reducedMotion}
      />

      {/* STATUS CARD — bottom-right. Phase line, then stat + track. */}
      <div
        data-phase={phase}
        className="generation-status absolute bottom-3 right-3 z-20 w-[264px] max-w-[calc(100%-24px)] rounded-xl border border-white/10 bg-black/65 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--generation-accent)] motion-reduce:hidden" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--generation-accent)]" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-none text-white/70">
            {label}
          </span>
        </div>
        {progressValue != null && (
          <div className="mt-2 flex items-center gap-2.5">
            <span className="w-[42px] shrink-0 font-mono text-[15px] font-semibold leading-none tabular-nums text-white">
              {progressValue}
              <span className="ml-0.5 align-super text-[9px] font-bold text-white/50">%</span>
            </span>
            <div
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressValue}
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="generation-status-fill h-full w-full rounded-full"
                style={{ transform: `scaleX(${Math.max(0.02, progressValue / 100)})` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
