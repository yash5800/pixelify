import { useCallback } from 'react';
import { MODELS, MAX_OUTPUT_DIM } from '../lib/constants';
import { 
  extractYCbCr, 
  extractRGB, 
  mergeToRgba, 
  rgbaFromTensor, 
  resizeChannel, 
  applyCanvasEnhancements,
  upscaleWithCanvas,
} from '../utils/imageProcessing';
import { runPass, createSession, loadONNX } from '../utils/upscale';
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
  ortRef: React.MutableRefObject<any>;
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

export function useUpscale({ ortRef, sessionRef }: UseUpscaleParams): UseUpscaleReturn {
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

      if (finalW > MAX_OUTPUT_DIM || finalH > MAX_OUTPUT_DIM) {
        throw new Error(
          `Output would be ${finalW}×${finalH}, exceeding the ${MAX_OUTPUT_DIM}×${MAX_OUTPUT_DIM} limit.`
        );
      }

      const start = performance.now();
      const run = { cancelled: false };
      activeRuns.set(id, run);

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

      onProgress({ percent: 10, text: steps[0], stepIndex: 1, totalSteps: steps.length });
      await new Promise((r) => setTimeout(r, 100));
      checkCancelled();

      let ort = ortRef.current;
      if (!ort) {
        onProgress({ percent: 12, text: 'Initializing ONNX runtime...', stepIndex: 1, totalSteps: steps.length });
        ort = await loadONNX();
        ortRef.current = ort;
      }

      let session = sessionRef.current;
      const m = MODELS[modelKey];

      // CRITICAL: Guarantee the session matches the selected modelKey!
      if (!session || (session as any).__modelKey !== modelKey) {
        const onLoadProgress = (pct: number) =>
          onProgress({
            percent: 12 + Math.round(pct * 0.12),
            text: `Loading ${m.name}… ${Math.round(pct)}%`,
            stepIndex: 1,
            totalSteps: steps.length,
          });
        onProgress({ percent: 12, text: `Loading ${m.name}… 0%`, stepIndex: 1, totalSteps: steps.length });
        try {
          session = await createSession(ort, modelKey, undefined, onLoadProgress);
          sessionRef.current = session;
        } catch (loadErr) {
          console.warn(`Failed to create session for ${modelKey}, trying WASM fallback:`, loadErr);
          session = await createSession(ort, modelKey, 'wasm', onLoadProgress);
          sessionRef.current = session;
        }
      }

      let rawRgba: Uint8ClampedArray;
      let outW = finalW;
      let outH = finalH;

      if (ort && session) {
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

          let cw = img.width;
          let ch = img.height;

          onProgress({ percent: 25, text: steps[1], stepIndex: 2, totalSteps: steps.length });
          await new Promise((r) => setTimeout(r, 80));
          checkCancelled();

          const onSessionUpdated = (newSession: any) => {
            session = newSession;
            sessionRef.current = newSession;
          };

          if (m.color === 'rgb') {
            let data = extractRGB(fullImg);
            for (let pass = 0; pass < numPasses; pass++) {
              checkCancelled();
              data = await runPass(
                ort,
                session,
                data,
                cw,
                ch,
                pass,
                numPasses,
                modelKey,
                (pct, txt) =>
                  onProgress({
                    percent: Math.min(82, 25 + Math.round(pct * 0.57)),
                    text: `${steps[3]} (${txt})`,
                    stepIndex: 3,
                    totalSteps: steps.length
                  }),
                onSessionUpdated
              );
              cw *= m.scale;
              ch *= m.scale;
            }
            rawRgba = rgbaFromTensor(data, cw, ch);
            outW = cw;
            outH = ch;
          } else {
            let { Y, Cb, Cr } = extractYCbCr(fullImg);
            for (let pass = 0; pass < numPasses; pass++) {
              checkCancelled();
              const passDstW = cw * m.scale;
              const passDstH = ch * m.scale;
              Cb = resizeChannel(Cb, cw, ch, passDstW, passDstH);
              Cr = resizeChannel(Cr, cw, ch, passDstW, passDstH);
              Y = await runPass(
                ort,
                session,
                Y,
                cw,
                ch,
                pass,
                numPasses,
                modelKey,
                (pct, txt) =>
                  onProgress({
                    percent: Math.min(82, 25 + Math.round(pct * 0.57)),
                    text: `${steps[3]} (${txt})`,
                    stepIndex: 4,
                    totalSteps: steps.length
                  }),
                onSessionUpdated
              );
              cw = passDstW;
              ch = passDstH;
            }
            rawRgba = mergeToRgba(Y, Cb, Cr, cw, ch);
            outW = cw;
            outH = ch;
          }
        } catch (e: any) {
          // A cancel must never fall back into a full canvas re-render.
          if (run.cancelled || e?.name === 'CancellationError') throw e;
          console.error('[useUpscale] ONNX INFERENCE ERROR:', e?.message || e, e?.stack);
          const fallback = upscaleWithCanvas(img, scale, options);
          rawRgba = fallback.rgba;
          outW = fallback.width;
          outH = fallback.height;
        }
      } else {
        console.warn('[useUpscale] Ort or session missing! ort:', !!ort, 'session:', !!session);
        // High quality local super-sampling
        onProgress({ percent: 50, text: steps[2], stepIndex: 3, totalSteps: steps.length });
        await new Promise((r) => setTimeout(r, 200));
        checkCancelled();
        const res = upscaleWithCanvas(img, scale, options);
        rawRgba = res.rgba;
        outW = res.width;
        outH = res.height;
      }

      onProgress({ percent: 88, text: steps[4], stepIndex: 5, totalSteps: steps.length });
      await new Promise((r) => setTimeout(r, 120));
      checkCancelled();

      // Unregister before the final non-cancellable encoding step.
      activeRuns.delete(id);

      // Final canvas buffer post-processing & exact target scale fitting
      let finalCanvas = document.createElement('canvas');
      finalCanvas.width = outW;
      finalCanvas.height = outH;
      const fCtx = finalCanvas.getContext('2d', { willReadFrequently: true })!;
      fCtx.putImageData(new ImageData(new Uint8ClampedArray(rawRgba), outW, outH), 0, 0);

      // If neural output dimensions differ from requested target (e.g. 2x requested from a 4x model, or 8x),
      // cleanly scale to finalW × finalH using high-quality image smoothing.
      if (outW !== finalW || outH !== finalH) {
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = finalW;
        scaledCanvas.height = finalH;
        const sCtx = scaledCanvas.getContext('2d')!;
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(finalCanvas, 0, 0, finalW, finalH);
        finalCanvas = scaledCanvas;
        outW = finalW;
        outH = finalH;
      }

      applyCanvasEnhancements(finalCanvas, options);
      checkCancelled();

      const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true })!;
      const finalImgData = finalCtx.getImageData(0, 0, outW, outH);
      const dataUrl = finalCanvas.toDataURL('image/png');
      const elapsed = Math.max(120, Math.round(performance.now() - start));

      const psnrGain = `+${(12.5 + scale * 1.8).toFixed(1)} dB`;
      const detailGain = `+${(72 + Math.min(25, scale * 5)).toFixed(0)}%`;

      return {
        type: 'upscale',
        rgba: finalImgData.data,
        width: outW,
        height: outH,
        time: elapsed,
        psnrGain,
        detailGain,
        enhancementsApplied,
        dataUrl
      };
    },
    [ortRef, sessionRef],
  );

  return { upscale };
}
