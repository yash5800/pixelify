/// <reference lib="webworker" />
import { enhanceImageDataBuffer } from '../imageProcessing';
import type { EnhancementOptions } from '../../types';

type ProcessMessage = {
  type: 'process';
  id: number;
  rgba: ArrayBuffer;
  srcW: number;
  srcH: number;
  targetW: number;
  targetH: number;
  options: EnhancementOptions;
};

/**
 * Final-pass postprocessing: optional high-quality rescale + enhancement +
 * PNG encode.
 *
 * The RGBA buffer arrives transferred, so we wrap it in an ImageData view
 * instead of copying it into a fresh `createImageData` buffer. At 100+ MP that
 * duplicate was another several-hundred-megabyte spike. When no rescale is
 * needed the enhancement runs in place and the canvas read-back is skipped.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async ({ data }: MessageEvent<ProcessMessage>) => {
  let canvas: OffscreenCanvas | undefined;
  let scratch: OffscreenCanvas | undefined;
  try {
    const pixels = new Uint8ClampedArray(data.rgba);
    const sourceImage = new ImageData(pixels, data.srcW, data.srcH);
    const needsResize = data.srcW !== data.targetW || data.srcH !== data.targetH;

    canvas = new OffscreenCanvas(data.targetW, data.targetH);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('OffscreenCanvas 2D context is unavailable.');

    let outputImage: ImageData;
    if (needsResize) {
      scratch = new OffscreenCanvas(data.srcW, data.srcH);
      const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
      if (!scratchCtx) throw new Error('OffscreenCanvas 2D context is unavailable.');
      scratchCtx.putImageData(sourceImage, 0, 0);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(scratch, 0, 0, data.targetW, data.targetH);

      // The canvas owns its pixels after drawImage; free the source surface.
      scratch.width = 0;
      scratch.height = 0;
      scratch = undefined;

      outputImage = ctx.getImageData(0, 0, data.targetW, data.targetH);
      enhanceImageDataBuffer(outputImage.data, data.targetW, data.targetH, data.options);
    } else {
      // Enhance the transferred buffer in place — skip the canvas round-trip.
      outputImage = sourceImage;
      enhanceImageDataBuffer(outputImage.data, data.targetW, data.targetH, data.options);
    }

    ctx.putImageData(outputImage, 0, 0);

    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    const pngBuffer = await pngBlob.arrayBuffer();
    canvas.width = 0;
    canvas.height = 0;
    scope.postMessage({ type: 'done', id: data.id, png: pngBuffer, width: data.targetW, height: data.targetH }, [pngBuffer]);
  } catch (error) {
    if (scratch) {
      scratch.width = 0;
      scratch.height = 0;
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    scope.postMessage({
      type: 'error',
      id: data.id,
      error: error instanceof Error ? error.message : String(error),
      rgba: data.rgba,
    }, [data.rgba]);
  }
};
