import type { EnhancementOptions } from '../../types';
import { enhanceImageDataBuffer } from '../imageProcessing';

export interface FinalizedImage {
  /** Object URL of the encoded PNG blob. Revoke it when the result is discarded. */
  blobUrl: string;
  width: number;
  height: number;
  /** Size of the encoded PNG in bytes. Photos at this resolution are ~1 B/px. */
  bytes: number;
}

interface PendingEntry {
  resolve: (value: { png: ArrayBuffer; width: number; height: number }) => void;
  reject: (error: Error, returnedRgba?: ArrayBuffer) => void;
}

let worker: Worker | null = null;
let workerBroken = false;
let nextRequestId = 1;
const pending = new Map<number, PendingEntry>();

function terminateWorker(): void {
  try {
    worker?.terminate();
  } catch {
    /* ignore */
  }
  worker = null;
}

function spawnWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('./postprocess.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ type: string; id: number; png?: ArrayBuffer; width?: number; height?: number; error?: string; rgba?: ArrayBuffer }>) => {
      const response = event.data;
      const entry = pending.get(response.id);
      if (!entry) return;
      pending.delete(response.id);
      if (response.type === 'error') {
        const error = new Error(response.error || 'Final encoding failed in the worker.') as Error & { returnedRgba?: ArrayBuffer };
        error.returnedRgba = response.rgba;
        entry.reject(error, response.rgba);
      } else if (response.type === 'done' && response.png) {
        entry.resolve({ png: response.png, width: response.width || 0, height: response.height || 0 });
      } else {
        entry.reject(new Error('Unexpected final-encoding worker response.'));
      }
    };
    worker.onerror = (event) => {
      const failure = new Error(event.message || 'Final encoding worker crashed.');
      terminateWorker();
      workerBroken = true;
      const failed = [...pending.values()];
      pending.clear();
      for (const entry of failed) entry.reject(failure);
    };
    return worker;
  } catch {
    workerBroken = true;
    worker = null;
    return null;
  }
}

/** Same pipeline as the worker document/thread-free, used without OffscreenCanvas support. */
export function postProcessOnMainThread(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  options: EnhancementOptions,
): Promise<FinalizedImage> {
  return new Promise<FinalizedImage>((resolve, reject) => {
    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    let scratch: HTMLCanvasElement | null = null;
    const releaseCanvases = () => {
      if (scratch) {
        scratch.width = 0;
        scratch.height = 0;
        scratch = null;
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
    };

    try {
      // Wrap the caller's buffer — do not copy it. ImageData takes ownership of
      // the array view, so enhancement can run in place. (The extra view keeps
      // TypeScript's ArrayBufferLike/Uint8ClampedArray generic satisfied.)
      const source = new ImageData(
        new Uint8ClampedArray(rgba.buffer as ArrayBuffer, rgba.byteOffset, rgba.byteLength),
        srcW,
        srcH,
      );
      const needsResize = srcW !== targetW || srcH !== targetH;

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context is unavailable.');

      let output: ImageData;
      if (needsResize) {
        scratch = document.createElement('canvas');
        scratch.width = srcW;
        scratch.height = srcH;
        const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
        if (!scratchCtx) throw new Error('Canvas 2D context is unavailable.');
        scratchCtx.putImageData(source, 0, 0);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(scratch, 0, 0, targetW, targetH);

        // The destination canvas owns its pixels; drop the source surface now.
        scratch.width = 0;
        scratch.height = 0;
        scratch = null;

        output = ctx.getImageData(0, 0, targetW, targetH);
        enhanceImageDataBuffer(output.data, targetW, targetH, options);
      } else {
        output = source;
        enhanceImageDataBuffer(output.data, targetW, targetH, options);
      }

      ctx.putImageData(output, 0, 0);

      canvas.toBlob(
        (blob) => {
          releaseCanvases();
          if (!blob) {
            reject(new Error('PNG encoding failed.'));
            return;
          }
          resolve({ blobUrl: URL.createObjectURL(blob), width: targetW, height: targetH, bytes: blob.size });
        },
        'image/png',
      );
    } catch (error) {
      releaseCanvases();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Runs resize → enhancement → PNG encoding. Prefers the OffscreenCanvas worker
 * so the page thread never blocks; the raw RGBA buffer is transferred there and
 * handed back for a main-thread retry if the worker fails mid-process.
 */
export async function processFinalImage(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  options: EnhancementOptions,
): Promise<FinalizedImage> {
  const wk = spawnWorker();
  if (!wk) {
    return postProcessOnMainThread(rgba, srcW, srcH, targetW, targetH, options);
  }
  const id = nextRequestId++;
  const buffer = rgba.buffer;
  let response: { png: ArrayBuffer; width: number; height: number };
  try {
    response = await new Promise<{ png: ArrayBuffer; width: number; height: number }>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      wk.postMessage({ type: 'process', id, rgba: buffer, srcW, srcH, targetW, targetH, options }, [buffer]);
    });
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    const returnedRgba = (failure as Error & { returnedRgba?: ArrayBuffer }).returnedRgba;
    if (!returnedRgba || returnedRgba.byteLength === 0) throw failure;
    console.warn('Final encoding worker failed; retrying on the page thread.', failure);
    return postProcessOnMainThread(new Uint8ClampedArray(returnedRgba), srcW, srcH, targetW, targetH, options);
  }
  const blob = new Blob([response.png], { type: 'image/png' });
  return { blobUrl: URL.createObjectURL(blob), width: response.width, height: response.height, bytes: response.png.byteLength };
}
