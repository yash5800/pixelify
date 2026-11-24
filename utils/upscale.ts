import { MODELS } from '../lib/constants';
import type { ModelKey } from '../types';
import { createSession, isUpscalerModelCached, runTileFromPlanes } from './upscaler/inference';
import { loadLiteRT } from './upscaler/runtime';
import type { LiteRtRuntime } from './upscaler/runtime';
import type { LiteRtSession, ModelLoadProgress } from './upscaler/inference';

/** Compatibility entry points used by the existing hooks; all execution is LiteRT.js. */
export { createSession, isUpscalerModelCached, loadLiteRT };
export type { LiteRtSession, LiteRtRuntime, ModelLoadProgress };

/**
 * Final-pass tile sink. Streaming straight into 8-bit buffers avoids the
 * multi-gigabyte `Float32Array(dstW*dstH*ch)` accumulation (and the second
 * RGBA copy) that made large 4× outputs exceed 2 GB of tab memory.
 */
export type PassSink =
  | { kind: 'rgba8'; data: Uint8ClampedArray }
  | { kind: 'y8'; data: Uint8ClampedArray };

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
  checkCancelled?: () => void,
  sink?: PassSink,
): Promise<Float32Array | null> {
  const m = MODELS[modelKey];
  const tileSize = m.tileSize;
  const scale = m.scale;
  const ch = m.color === 'rgb' ? 3 : 1;
  const dstW = srcW * scale;
  const dstH = srcH * scale;
  const numHTiles = Math.ceil(srcW / tileSize);
  const numVTiles = Math.ceil(srcH / tileSize);
  const totalTiles = numHTiles * numVTiles;
  if (sink?.kind === 'rgba8') {
    if (ch !== 3) throw new Error(`rgba8 sink requires an RGB model (${modelKey} is single-channel).`);
    if (sink.data.length !== dstW * dstH * 4) {
      throw new Error(`rgba8 sink is ${sink.data.length} bytes; expected ${dstW * dstH * 4}.`);
    }
  } else if (sink?.kind === 'y8') {
    if (ch !== 1) throw new Error(`y8 sink requires a single-channel model (${modelKey} is RGB).`);
    if (sink.data.length !== dstW * dstH) {
      throw new Error(`y8 sink is ${sink.data.length} bytes; expected ${dstW * dstH}.`);
    }
  }
  // Only non-final passes (8× second pass on tiny images) keep a float buffer.
  const outData = sink ? null : new Float32Array(dstW * dstH * ch);
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
  checkCancelled?.();
  let lastReportedPct = -1;
  // Yield on a time budget instead of once per tile. Awaiting a frame for every
  // 128px tile added ~16 ms each — tens of seconds on a 2000-tile run — while
  // most tiles only hold the page thread for a millisecond or two.
  let lastYieldAt = performance.now();
  const yieldIfBusy = async () => {
    if (performance.now() - lastYieldAt < 40) return;
    await yieldToBrowser();
    lastYieldAt = performance.now();
  };
  for (let ty = 0; ty < numVTiles; ty++) for (let tx = 0; tx < numHTiles; tx++) {
    checkCancelled?.();
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

    const expectedElements = tileSize * scale * tileSize * scale * ch;
    const assertOutput = (output: Float32Array) => {
      if (output.length !== expectedElements || !output.some((value) => Math.abs(value) > 1e-20)) {
        throw new Error(`LiteRT ${modelKey} returned an invalid or empty output tile.`);
      }
    };
    let rawOut: Float32Array;
    try {
      rawOut = await runTileFromPlanes(runtime, session, data, srcW, srcH, inX, inY, tileSize, tileSize, ch);
      assertOutput(rawOut);
    } catch (error) {
      if (session.__engine !== 'webgpu') throw error;
      console.warn(`LiteRT WebGPU tile failed for ${modelKey}; switching to WASM.`, error);
      session = await createSession(runtime, modelKey, 'wasm');
      session.__fallback = true;
      session.__fallbackReason = error instanceof Error ? error.message : String(error);
      onSessionUpdated?.(session);
      rawOut = await runTileFromPlanes(runtime, session, data, srcW, srcH, inX, inY, tileSize, tileSize, ch);
      assertOutput(rawOut);
    }

    const tileFull = tileSize * scale;
    const tw = Math.min(tileFull, dstW - tx * tileFull);
    const th = Math.min(tileFull, dstH - ty * tileFull);
    const outX = tx * tileFull;
    const outY = ty * tileFull;
    if (sink?.kind === 'rgba8') {
      const out = sink.data;
      for (let y = 0; y < th; y++) {
        let dst = ((outY + y) * dstW + outX) * 4;
        for (let x = 0; x < tw; x++) {
          const pixel = y * tileFull + x;
          const base = outputHwc ? pixel * ch : pixel;
          if (outputHwc) {
            out[dst] = rawOut[base] * 255;
            out[dst + 1] = rawOut[base + 1] * 255;
            out[dst + 2] = rawOut[base + 2] * 255;
          } else {
            const plane = tileFull * tileFull;
            out[dst] = rawOut[base] * 255;
            out[dst + 1] = rawOut[base + plane] * 255;
            out[dst + 2] = rawOut[base + plane * 2] * 255;
          }
          out[dst + 3] = 255;
          dst += 4;
        }
      }
    } else if (sink?.kind === 'y8') {
      const out = sink.data;
      for (let y = 0; y < th; y++) {
        let dst = (outY + y) * dstW + outX;
        for (let x = 0; x < tw; x++) {
          const pixel = y * tileFull + x;
          out[dst++] = rawOut[pixel] * 255;
        }
      }
    } else {
      const target = outData!;
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const dst = ((outY + y) * dstW + outX + x) * ch;
        const pixel = y * tileFull + x;
        for (let c = 0; c < ch; c++) {
          const src = outputHwc ? pixel * ch + c : c * tileFull * tileFull + pixel;
          target[dst + c] = rawOut[src];
        }
      }
    }
    await yieldIfBusy();
    checkCancelled?.();
  }
  return outData;
}
