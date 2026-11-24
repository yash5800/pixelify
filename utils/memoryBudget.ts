import { MAX_OUTPUT_DIM } from '../lib/constants';

/**
 * Output-pixel budgets for on-device upscaling.
 *
 * The upscaler holds the decoded source, float working planes, the 8-bit RGBA
 * output, a canvas copy for encoding and the PNG buffer at the same time. That
 * peak is proportional to the number of OUTPUT pixels (source pixels × scale²),
 * not to the file size, so a 4 MB 4000×3000 JPEG is ~192 MP at 4× and used to
 * allocate several gigabytes.
 *
 * Desktop is capped at 8K UHD output (7680×4320 = 33,177,600 px, ≈663 MB
 * estimated peak at 20 bytes per output pixel). Low-memory devices keep the
 * 16 MP ceiling. Both are tunable with NEXT_PUBLIC_MAX_OUTPUT_PIXELS.
 */
function envPixels(): number | null {
  const raw = process.env.NEXT_PUBLIC_MAX_OUTPUT_PIXELS;
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** 8K UHD total pixels. */
export const MAX_OUTPUT_PIXELS = envPixels() ?? 33_177_600;
export const LOW_MEMORY_OUTPUT_PIXELS = envPixels() ?? 16_000_000;

/** Source-image ceiling for the upscaler, independent of the output budget. */
export const MAX_SOURCE_PIXELS = 32_000_000;

export type UpscaleScale = 2 | 4 | 8;

/** Conservative bytes of resident memory per output pixel for the full pipeline. */
const BYTES_PER_OUTPUT_PIXEL = 20;

export function getMaxOutputPixels(): number {
  if (typeof navigator === 'undefined') return MAX_OUTPUT_PIXELS;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 4) {
    return LOW_MEMORY_OUTPUT_PIXELS;
  }
  return MAX_OUTPUT_PIXELS;
}

/**
 * Whether idle background preloading of the AI stacks is appropriate.
 *
 * Warming both stacks costs hundreds of MB of resident memory. On a low-memory
 * device or a metered/data-saver connection that is a poor trade: the tab pays
 * for models it may never use. On-demand paths still load a stack when its tab
 * is opened.
 */
export function shouldPreloadInBackground(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 4) return false;
  return true;
}

export function estimateUpscalePeakBytes(width: number, height: number, scale: number): number {
  return Math.max(0, width * height * scale * scale) * BYTES_PER_OUTPUT_PIXEL;
}

export interface UpscaleBudget {
  ok: boolean;
  /** Output dimensions for the requested scale. */
  width: number;
  height: number;
  /** Output pixels for the requested scale. */
  pixels: number;
  /** Output-pixel cap on this device. */
  maxPixels: number;
  /** Rough peak resident memory for the requested scale, in bytes. */
  estimatedPeakBytes: number;
  /** Largest scale that fits both the dimension and the pixel budget. */
  suggestedScale: UpscaleScale | null;
}

export function suggestScale(width: number, height: number, maxPixels = getMaxOutputPixels()): UpscaleScale | null {
  for (const scale of [8, 4, 2] as UpscaleScale[]) {
    if (width * scale > MAX_OUTPUT_DIM || height * scale > MAX_OUTPUT_DIM) continue;
    if (width * height * scale * scale > maxPixels) continue;
    return scale;
  }
  return null;
}

export function checkUpscaleBudget(
  width: number,
  height: number,
  scale: number,
  maxPixels = getMaxOutputPixels(),
): UpscaleBudget {
  const outWidth = Math.round(width * scale);
  const outHeight = Math.round(height * scale);
  const pixels = outWidth * outHeight;
  const withinDimensions = outWidth <= MAX_OUTPUT_DIM && outHeight <= MAX_OUTPUT_DIM;
  return {
    ok: withinDimensions && pixels <= maxPixels,
    width: outWidth,
    height: outHeight,
    pixels,
    maxPixels,
    estimatedPeakBytes: estimateUpscalePeakBytes(width, height, scale),
    suggestedScale: suggestScale(width, height, maxPixels),
  };
}

export function formatPixels(pixels: number): string {
  if (pixels >= 1_000_000) return `${(pixels / 1_000_000).toFixed(1)} MP`;
  if (pixels >= 1_000) return `${(pixels / 1_000).toFixed(0)} KP`;
  return `${Math.round(pixels)} px`;
}
