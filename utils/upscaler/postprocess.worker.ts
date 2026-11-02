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

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async ({ data }: MessageEvent<ProcessMessage>) => {
  let canvas: OffscreenCanvas | undefined;
  try {
    canvas = new OffscreenCanvas(data.srcW, data.srcH);
    const baseCtx = canvas.getContext('2d', { willReadFrequently: true });
    if (!baseCtx) throw new Error('OffscreenCanvas 2D context is unavailable.');
    const baseImage = baseCtx.createImageData(data.srcW, data.srcH);
    baseImage.data.set(new Uint8ClampedArray(data.rgba));
    baseCtx.putImageData(baseImage, 0, 0);

    if (data.srcW !== data.targetW || data.srcH !== data.targetH) {
      const scaled = new OffscreenCanvas(data.targetW, data.targetH);
      const scalerCtx = scaled.getContext('2d');
      if (!scalerCtx) throw new Error('OffscreenCanvas 2D context is unavailable.');
      scalerCtx.imageSmoothingEnabled = true;
      scalerCtx.imageSmoothingQuality = 'high';
      scalerCtx.drawImage(canvas, 0, 0, data.targetW, data.targetH);
      canvas = scaled;
    }

    const finalCtx = canvas.getContext('2d', { willReadFrequently: true });
    if (!finalCtx) throw new Error('OffscreenCanvas 2D context is unavailable.');
    const outImage = finalCtx.getImageData(0, 0, data.targetW, data.targetH);
    enhanceImageDataBuffer(outImage.data, data.targetW, data.targetH, data.options);
    finalCtx.putImageData(outImage, 0, 0);

    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    const pngBuffer = await pngBlob.arrayBuffer();
    scope.postMessage({ type: 'done', id: data.id, png: pngBuffer, width: data.targetW, height: data.targetH }, [pngBuffer]);
  } catch (error) {
    scope.postMessage({
      type: 'error',
      id: data.id,
      error: error instanceof Error ? error.message : String(error),
      rgba: data.rgba,
    }, [data.rgba]);
  }
};
