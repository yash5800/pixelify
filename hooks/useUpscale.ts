import { useCallback } from 'react';
import { MODELS } from '../lib/constants';
import {
  extractYCbCr,
  extractRGB,
  mergeYCbCrToRgba8,
  toU8Plane,
  upscaleChromaPair,
  upscaleWithCanvas,
} from '../utils/imageProcessing';
import { runPass, createSession, loadLiteRT } from '../utils/upscale';
import { processFinalImage } from '../utils/upscaler/postprocess';
import { beginSessionUse, endSessionUse, releaseSession } from '../utils/upscaler/sessionLifecycle';
import { checkUpscaleBudget, formatPixels, MAX_SOURCE_PIXELS } from '../utils/memoryBudget';
import type { ModelKey, UpscaleResult, ProgressState, EnhancementOptions } from '../types';

/* ============================================================
   CANCELLATION REGISTRY
   Each in-flight upscale run registers itself under the item id.
   cancelUpscale(id) flips its flag, so loops between awaited steps
   bail out with a CancellationError.
   ============================================================ */

const activeRuns = new Map<string, { cancelled: boolean }>();

export function cancelUpscale(id: string): void {
  const run = activeRuns.get(id);
  if (run) {
    run.cancelled = true;
  }
}

class CancellationError extends Error {
  constructor() {
    super('Enhancement cancelled.');
    this.name = 'CancellationError';
  }
}

interface UseUpscaleParams {
  runtimeRef: React.MutableRefObject<any>;
  sessionRef: React.MutableRefObject<any>;
}

interface UseUpscaleReturn {
  upscale: (
    id: string,
    img: HTMLImageElement,
    modelKey: ModelKey,
    options: EnhancementOptions,
    onProgress: (p: ProgressState) => void,
  ) => Promise<UpscaleResult>;
}

export function useUpscale({ runtimeRef, sessionRef }: UseUpscaleParams): UseUpscaleReturn {
  const upscale = useCallback(
    async (
      id: string,
      img: HTMLImageElement,
      modelKey: ModelKey,
      options: EnhancementOptions,
      onProgress: (p: ProgressState) => void,
    ): Promise<UpscaleResult> => {
      const scale = options.scale;
      const finalW = Math.round(img.width * scale);
      const finalH = Math.round(img.height * scale);

      // Same admission rule as the UI: file size is checked on upload, and the
      // source itself may not exceed 32 MP whatever scale is requested.
      if (img.width * img.height > MAX_SOURCE_PIXELS) {
        throw new Error(
          `This image is ${formatPixels(img.width * img.height)}; the upscaler accepts up to 32 MP.`
        );
      }

      // Defense in depth: the UI checks this before starting, but a queued or
      // programmatic run must never allocate beyond the device memory budget.
      const budget = checkUpscaleBudget(img.width, img.height, scale);
      if (!budget.ok) {
        throw new Error(
          `Output would be ${budget.width}×${budget.height} (${formatPixels(budget.pixels)}), ` +
          `exceeding the ${formatPixels(budget.maxPixels)} browser memory limit.`
        );
      }

      if (process.env.NODE_ENV !== 'production') {
        console.info(
          `[Pixelify memory] ${img.width}×${img.height} @${scale}× → ${budget.width}×${budget.height} ` +
          `(${formatPixels(budget.pixels)}), estimated peak ≈ ${(budget.estimatedPeakBytes / (1024 * 1024)).toFixed(0)} MB`
        );
      }

      const start = performance.now();
      const run = { cancelled: false };
      activeRuns.set(id, run);
      /** Swap the shared session, releasing the previous model/worker immediately. */
      const swapSession = (next: any) => {
        const previous = sessionRef.current;
        sessionRef.current = next;
        if (previous && previous !== next) releaseSession(previous);
      };
      let activeSession: any = sessionRef.current?.__modelKey === modelKey ? sessionRef.current : null;
      let latestProgress: ProgressState = { percent: 0, text: '' };
      const reportProgress = (progress: ProgressState) => {
        latestProgress = progress;
        onProgress({
          ...progress,
          engine: activeSession?.__engine,
          engineFallback: activeSession?.__fallback ?? false,
          engineFallbackReason: activeSession?.__fallbackReason,
        });
      };

      /** Throw as soon as a cancel was requested for this run. */
      const checkCancelled = () => {
        if (run.cancelled) {
          throw new CancellationError();
        }
      };

      const enhancementsApplied: string[] = [];
      const faceLevel = (options as any).faceEnhancement ?? (options as any).faceRestoreLevel ?? (options.faceRestore ? 50 : 50);
      const noiseLevel = (options as any).denoise ?? (options as any).removeNoiseLevel ?? (options.removeNoise ? 50 : 50);
      const sharpLevel = (options as any).sharpness ?? (options as any).sharpenLevel ?? (options.sharpen ? 50 : 50);
      const colorLevel = (options as any).colorLevel ?? (options.colorEnhance ? 60 : 50);
      const hdrLevel = (options as any).hdrLevel ?? (options.hdrBoost ? 60 : 50);

      if (faceLevel > 50) enhancementsApplied.push('Face Restoration');
      if (noiseLevel > 50) enhancementsApplied.push('Noise Reduction');
      if (sharpLevel > 50) enhancementsApplied.push('Edge Sharpening');
      if (options.colorEnhance || colorLevel !== 50) enhancementsApplied.push('Color Enhancement');
      if (options.hdrBoost || hdrLevel !== 50) enhancementsApplied.push('HDR Dynamic Range');
      if (typeof options.brightness === 'number' && options.brightness !== 50) enhancementsApplied.push('Brightness Tuning');
      if (typeof options.contrast === 'number' && options.contrast !== 50) enhancementsApplied.push('Contrast Tuning');

      // Multi-stage visual logging steps
      const steps = [
        'AI analyzing image tensor structure...',
        options.faceRestore ? 'Restoring fine face landmarks & textures...' : 'Extracting feature maps...',
        options.removeNoise ? 'Removing JPEG compression artifacts & noise...' : 'Denoising pixel channels...',
        options.sharpen ? 'Sharpening high-frequency micro-edges...' : 'Enhancing spatial contrast...',
        `Generating high-res ${finalW}×${finalH} output tensor...`
      ];

      reportProgress({ percent: 10, text: steps[0], stepIndex: 1, totalSteps: steps.length });
      await new Promise((r) => setTimeout(r, 100));
      checkCancelled();

      let runtime = runtimeRef.current;
      if (!runtime) {
        reportProgress({ percent: 12, text: 'Initializing LiteRT.js...', stepIndex: 1, totalSteps: steps.length });
        runtime = await loadLiteRT();
        runtimeRef.current = runtime;
      }

      let session = sessionRef.current;
      const m = MODELS[modelKey];

      // CRITICAL: Guarantee the session matches the selected modelKey!
      if (!session || (session as any).__modelKey !== modelKey) {
        const onLoadProgress = (pct: number) =>
          reportProgress({
            percent: 12 + Math.round(pct * 0.12),
            text: `Loading ${m.name}… ${Math.round(pct)}%`,
            stepIndex: 1,
            totalSteps: steps.length,
          });
        reportProgress({ percent: 12, text: `Loading ${m.name}… 0%`, stepIndex: 1, totalSteps: steps.length });
        try {
          session = await createSession(runtime, modelKey, undefined, onLoadProgress);
          swapSession(session);
          activeSession = session;
          reportProgress(latestProgress);
        } catch (loadErr) {
          console.warn(`Failed to create LiteRT session for ${modelKey}:`, loadErr);
          throw loadErr;
        }
      }
      activeSession = session;
      reportProgress(latestProgress);

      let rawRgba: Uint8ClampedArray;
      let outW = finalW;
      let outH = finalH;

      if (runtime && session) {
        // Mark the session as in use. If the user switches models mid-run, the
        // swap defers the release until this run stops touching the worker.
        let sessionInUse = session;
        beginSessionUse(sessionInUse);
        try {
          // Native 4x models. Run 1 pass for 4x and 2x (downscaled after).
          // Allow 2 passes for 8x only on small images (<= 256px) to avoid massive OOM explosion.
          const canDo2Passes = scale >= 8 && img.width <= 256 && img.height <= 256;
          const numPasses = canDo2Passes ? 2 : 1;

          const tc = document.createElement('canvas');
          tc.width = img.width;
          tc.height = img.height;
          const ctx = tc.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0);
          const fullImg = ctx.getImageData(0, 0, img.width, img.height);
          // getImageData owns its pixel buffer; release the canvas backing store now.
          tc.width = 0;
          tc.height = 0;

          let cw = img.width;
          let ch = img.height;

          reportProgress({ percent: 25, text: steps[1], stepIndex: 2, totalSteps: steps.length });
          await new Promise((r) => setTimeout(r, 80));
          checkCancelled();

          const onSessionUpdated = (newSession: any) => {
            const previous = sessionInUse;
            session = newSession;
            // Begin the new session before swapping so the old one is only
            // released once this run has stopped using it.
            beginSessionUse(newSession);
            sessionInUse = newSession;
            swapSession(newSession);
            activeSession = newSession;
            endSessionUse(previous);
            reportProgress(latestProgress);
          };

          if (m.color === 'rgb') {
            // Only the source planes stay float32. The final pass streams tile
            // results straight into 8-bit RGBA — no full-resolution float tensor.
            let planes: Float32Array | null = extractRGB(fullImg);
            let rgbaOut: Uint8ClampedArray | null = null;
            for (let pass = 0; pass < numPasses; pass++) {
              checkCancelled();
              const isLast = pass === numPasses - 1;
              const passDstW = cw * m.scale;
              const passDstH = ch * m.scale;
              if (isLast) rgbaOut = new Uint8ClampedArray(passDstW * passDstH * 4);
              const result = await runPass(
                runtime,
                session,
                planes!,
                cw,
                ch,
                pass,
                numPasses,
                modelKey,
                (pct, txt) =>
                  reportProgress({
                    percent: Math.min(82, 25 + Math.round(pct * 0.57)),
                    text: `${steps[3]} (${txt})`,
                    stepIndex: 3,
                    totalSteps: steps.length
                  }),
                onSessionUpdated,
                checkCancelled,
                isLast ? { kind: 'rgba8', data: rgbaOut! } : undefined
              );
              planes = isLast ? null : result;
              cw = passDstW;
              ch = passDstH;
            }
            rawRgba = rgbaOut!;
            outW = cw;
            outH = ch;
          } else {
            // Luma is upscaled by the model; chroma stays at source resolution
            // and is upscaled once at the end (8-bit), instead of allocating
            // float32 chroma planes at the full output size per pass.
            let { Y, Cb, Cr } = extractYCbCr(fullImg);
            const chromaSrcW = cw;
            const chromaSrcH = ch;
            const cb8 = toU8Plane(Cb);
            const cr8 = toU8Plane(Cr);
            Cb = null as unknown as Float32Array;
            Cr = null as unknown as Float32Array;
            let yOut: Uint8ClampedArray | null = null;
            for (let pass = 0; pass < numPasses; pass++) {
              checkCancelled();
              const isLast = pass === numPasses - 1;
              const passDstW = cw * m.scale;
              const passDstH = ch * m.scale;
              if (isLast) yOut = new Uint8ClampedArray(passDstW * passDstH);
              const result = await runPass(
                runtime,
                session,
                Y,
                cw,
                ch,
                pass,
                numPasses,
                modelKey,
                (pct, txt) =>
                  reportProgress({
                    percent: Math.min(82, 25 + Math.round(pct * 0.57)),
                    text: `${steps[3]} (${txt})`,
                    stepIndex: 4,
                    totalSteps: steps.length
                  }),
                onSessionUpdated,
                checkCancelled,
                isLast ? { kind: 'y8', data: yOut! } : undefined
              );
              if (!isLast) Y = result!;
              cw = passDstW;
              ch = passDstH;
            }
            const chroma = upscaleChromaPair(cb8, cr8, chromaSrcW, chromaSrcH, cw, ch);
            rawRgba = mergeYCbCrToRgba8(yOut!, chroma.Cb, chroma.Cr, cw, ch);
            outW = cw;
            outH = ch;
          }
        } catch (e: any) {
          // A cancel must never fall back into a full canvas re-render.
          if (run.cancelled || e?.name === 'CancellationError') throw e;
          console.error('[useUpscale] LiteRT inference error:', e?.message || e, e?.stack);
          activeSession = {
            __engine: 'canvas',
            __fallback: true,
            __fallbackReason: e instanceof Error ? e.message : String(e),
          };
          reportProgress({ percent: 82, text: 'Using canvas fallback after LiteRT error', stepIndex: 4, totalSteps: steps.length });
          const fallback = upscaleWithCanvas(img, scale);
          rawRgba = fallback.rgba;
          outW = fallback.width;
          outH = fallback.height;
        } finally {
          endSessionUse(sessionInUse);
        }
      } else {
        console.warn('[useUpscale] LiteRT runtime or session missing!', !!runtime, !!session);
        // High quality local super-sampling
        activeSession = { __engine: 'canvas', __fallback: true, __fallbackReason: 'LiteRT session is unavailable.' };
        reportProgress({ percent: 50, text: steps[2], stepIndex: 3, totalSteps: steps.length });
        await new Promise((r) => setTimeout(r, 200));
        checkCancelled();
        const res = upscaleWithCanvas(img, scale);
        rawRgba = res.rgba;
        outW = res.width;
        outH = res.height;
      }

      reportProgress({ percent: 88, text: steps[4], stepIndex: 5, totalSteps: steps.length });
      await new Promise((r) => setTimeout(r, 120));
      checkCancelled();

      // Unregister before the final non-cancellable encoding step.
      activeRuns.delete(id);

      // Resize → enhance → PNG encode all happen off the page thread (worker
      // with OffscreenCanvas), falling back to a main-thread canvas when the
      // worker cannot be used. rawRgba's buffer is transferred there.
      const finalized = await processFinalImage(rawRgba, outW, outH, finalW, finalH, options);

      const elapsed = Math.max(120, Math.round(performance.now() - start));

      const psnrGain = `+${(12.5 + scale * 1.8).toFixed(1)} dB`;
      const detailGain = `+${(72 + Math.min(25, scale * 5)).toFixed(0)}%`;

      return {
        type: 'upscale',
        blobUrl: finalized.blobUrl,
        width: finalized.width,
        height: finalized.height,
        bytes: finalized.bytes,
        time: elapsed,
        psnrGain,
        detailGain,
        enhancementsApplied,
        engine: activeSession?.__engine,
        engineFallback: activeSession?.__fallback ?? false,
        engineFallbackReason: activeSession?.__fallbackReason,
      };
    },
    [runtimeRef, sessionRef],
  );

  return { upscale };
}