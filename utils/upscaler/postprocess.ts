import type { EnhancementOptions } from '../../types';
import { enhanceImageDataBuffer } from '../imageProcessing';

export interface FinalizedImage {
  /** Object URL of the encoded PNG blob. Revoke it when the result is discarded. */
  blobUrl: string;
  width: number;
  height: number;
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
    try {
      let final = document.createElement('canvas');
      final.width = srcW;
      final.height = srcH;
      const baseCtx = final.getContext('2d', { willReadFrequently: true });
      if (!baseCtx) throw new Error('Canvas 2D context is unavailable.');
      baseCtx.putImageData(new ImageData(new Uint8ClampedArray(rgba), srcW, srcH), 0, 0);

      if (srcW !== targetW || srcH !== targetH) {
        const scaled = document.createElement('canvas');
        scaled.width = targetW;
        scaled.height = targetH;
        const scalerCtx = scaled.getContext('2d');
        if (!scalerCtx) throw new Error('Canvas 2D context is unavailable.');
        scalerCtx.imageSmoothingEnabled = true;
        scalerCtx.imageSmoothingQuality = 'high';
        scalerCtx.drawImage(final, 0, 0, targetW, targetH);
        final = scaled;
      }

      const finalCtx = final.getContext('2d', { willReadFrequently: true });
      if (!finalCtx) throw new Error('Canvas 2D context is unavailable.');
      const imgData = finalCtx.getImageData(0, 0, targetW, targetH);
      enhanceImageDataBuffer(imgData.data, targetW, targetH, options);
      finalCtx.putImageData(imgData, 0, 0);

      final.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('PNG encoding failed.'));
            return;
          }
          resolve({ blobUrl: URL.createObjectURL(blob), width: targetW, height: targetH });
        },
        'image/png',
      );
    } catch (error) {
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
  return { blobUrl: URL.createObjectURL(blob), width: response.width, height: response.height };
}
