import { MODELS } from '../lib/constants';
import type { ModelKey } from '../types';
import { createSession, isUpscalerModelCached, runTile } from './upscaler/inference';
import { loadLiteRT } from './upscaler/runtime';
import type { LiteRtRuntime } from './upscaler/runtime';
import type { LiteRtSession, ModelLoadProgress } from './upscaler/inference';

/** Compatibility entry points used by the existing hooks; all execution is LiteRT.js. */
export { createSession, isUpscalerModelCached, loadLiteRT };
export type { LiteRtSession, LiteRtRuntime, ModelLoadProgress };

export async function runPass(
  runtime: LiteRtRuntime,
  session: LiteRtSession,
  data: Float32Array,
  srcW: number,
  srcH: number,
  passIdx: number,
  totalPasses: number,
  modelKey: ModelKey,
  onProgress: (pct: number, text: string) => void,
  onSessionUpdated?: (newSession: LiteRtSession) => void,
): Promise<Float32Array> {
  const m = MODELS[modelKey];
  const tileSize = m.tileSize;
  const scale = m.scale;
  const ch = m.color === 'rgb' ? 3 : 1;
  const dstW = srcW * scale;
  const dstH = srcH * scale;
  const numHTiles = Math.ceil(srcW / tileSize);
  const numVTiles = Math.ceil(srcH / tileSize);
  const totalTiles = numHTiles * numVTiles;
  const outData = new Float32Array(dstW * dstH * ch);
  let done = 0;
  const outputShape = Array.from(session.outputDetails[0].shape as ArrayLike<number>);
  const outputHwc = outputShape.length === 4 && outputShape[3] === ch;
  const outputHeight = outputHwc ? outputShape[1] : outputShape[2];
  const outputWidth = outputHwc ? outputShape[2] : outputShape[3];
  if (outputHeight !== tileSize * scale || outputWidth !== tileSize * scale) {
    throw new Error(`LiteRT ${modelKey} output is ${outputShape.join('×')}; expected a ${tileSize * scale}×${tileSize * scale} tile.`);
  }

  // Let the browser paint between tiles. LiteRT's WASM delegate can keep the
  // main thread busy for a noticeable time per tile, so yielding only every
  // few tiles still makes the whole page appear frozen on slower devices.
  const yieldToBrowser = () => new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
  await yieldToBrowser();
  let lastReportedPct = -1;
  for (let ty = 0; ty < numVTiles; ty++) for (let tx = 0; tx < numHTiles; tx++) {
    done++;
    const pct = passIdx * 100 / totalPasses + done / totalTiles * 100 / totalPasses;
    const roundedPct = Math.round(pct);
    // Avoid triggering a full React progress update for every tile on large
    // inputs. Keep the display moving at a readable cadence instead.
    if (roundedPct !== lastReportedPct && (done === 1 || done === totalTiles || done % 3 === 0)) {
      onProgress(roundedPct, `Reconstructing details… ${roundedPct}%`);
      lastReportedPct = roundedPct;
    }
    const inX = tx * tileSize;
    const inY = ty * tileSize;
    const tileHWC = new Float32Array(tileSize * tileSize * ch);
    for (let y = 0; y < tileSize; y++) for (let x = 0; x < tileSize; x++) {
      const sy = Math.min(inY + y, srcH - 1);
      const sx = Math.min(inX + x, srcW - 1);
      const srcOff = (sy * srcW + sx) * ch;
      const dstOff = (y * tileSize + x) * ch;
      for (let c = 0; c < ch; c++) tileHWC[dstOff + c] = data[srcOff + c];
    }
    const tileCHW = new Float32Array(tileHWC.length);
    for (let c = 0; c < ch; c++) for (let y = 0; y < tileSize; y++) for (let x = 0; x < tileSize; x++)
      tileCHW[c * tileSize * tileSize + y * tileSize + x] = tileHWC[(y * tileSize + x) * ch + c];

    const expectedElements = tileSize * scale * tileSize * scale * ch;
    const assertOutput = (output: Float32Array) => {
      if (output.length !== expectedElements || !output.some((value) => Math.abs(value) > 1e-20)) {
        throw new Error(`LiteRT ${modelKey} returned an invalid or empty output tile.`);
      }
    };
    let rawOut: Float32Array;
    try {
      rawOut = await runTile(runtime, session, tileCHW, tileSize, tileSize, ch);
      assertOutput(rawOut);
    } catch (error) {
      if (session.__engine !== 'webgpu') throw error;
      console.warn(`LiteRT WebGPU tile failed for ${modelKey}; switching to WASM.`, error);
      session = await createSession(runtime, modelKey, 'wasm');
      session.__fallback = true;
      session.__fallbackReason = error instanceof Error ? error.message : String(error);
      onSessionUpdated?.(session);
      rawOut = await runTile(runtime, session, tileCHW, tileSize, tileSize, ch);
      assertOutput(rawOut);
    }

    const tileFull = tileSize * scale;
    const tw = Math.min(tileFull, dstW - tx * tileFull);
    const th = Math.min(tileFull, dstH - ty * tileFull);
    const outX = tx * tileFull;
    const outY = ty * tileFull;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const dst = ((outY + y) * dstW + outX + x) * ch;
      const pixel = y * tileFull + x;
      for (let c = 0; c < ch; c++) {
        const src = outputHwc ? pixel * ch + c : c * tileFull * tileFull + pixel;
        outData[dst + c] = rawOut[src];
      }
    }
    await yieldToBrowser();
  }
  return outData;
}
