import type { EnhancementOptions } from '../types';

export function extractYCbCr(imgData: ImageData): { Y: Float32Array; Cb: Float32Array; Cr: Float32Array } {
  const len = imgData.width * imgData.height;
  const Y = new Float32Array(len);
  const Cb = new Float32Array(len);
  const Cr = new Float32Array(len);
  for (let i = 0, j = 0; i < imgData.data.length; i += 4, j++) {
    const r = imgData.data[i] / 255;
    const g = imgData.data[i + 1] / 255;
    const b = imgData.data[i + 2] / 255;
    Y[j] = 0.299 * r + 0.587 * g + 0.114 * b;
    Cb[j] = -0.1687 * r - 0.3313 * g + 0.5 * b + 0.5;
    Cr[j] = 0.5 * r - 0.4187 * g - 0.0813 * b + 0.5;
  }
  return { Y, Cb, Cr };
}

export function mergeToRgba(Y: Float32Array, Cb: Float32Array, Cr: Float32Array, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < Y.length; i++) {
    const y = Y[i];
    const cb = Cb[i] - 0.5;
    const cr = Cr[i] - 0.5;
    out[i * 4] = Math.min(255, Math.max(0, (y + 1.402 * cr) * 255));
    out[i * 4 + 1] = Math.min(255, Math.max(0, (y - 0.3441 * cb - 0.7141 * cr) * 255));
    out[i * 4 + 2] = Math.min(255, Math.max(0, (y + 1.772 * cb) * 255));
    out[i * 4 + 3] = 255;
  }
  return out;
}

export function rgbaFromTensor(data: Float32Array, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = Math.min(255, Math.max(0, data[i * 3] * 255));
    out[i * 4 + 1] = Math.min(255, Math.max(0, data[i * 3 + 1] * 255));
    out[i * 4 + 2] = Math.min(255, Math.max(0, data[i * 3 + 2] * 255));
    out[i * 4 + 3] = 255;
  }
  return out;
}

export function extractRGB(imgData: ImageData): Float32Array {
  const d = imgData.data;
  const len = imgData.width * imgData.height;
  const rgb = new Float32Array(len * 3);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
    rgb[j] = d[i] / 255;
    rgb[j + 1] = d[i + 1] / 255;
    rgb[j + 2] = d[i + 2] / 255;
  }
  return rgb;
}

export function resizeChannel(data: Float32Array, srcW: number, srcH: number, dstW: number, dstH: number): Float32Array {
  if (srcW === dstW && srcH === dstH) return data.slice();
  const c = document.createElement('canvas');
  c.width = srcW;
  c.height = srcH;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const tmp = new Uint8ClampedArray(srcW * srcH * 4);
  for (let i = 0; i < data.length; i++) {
    const v = Math.min(255, Math.max(0, data[i] * 255));
    tmp[i * 4] = tmp[i * 4 + 1] = tmp[i * 4 + 2] = v;
    tmp[i * 4 + 3] = 255;
  }
  ctx.putImageData(new ImageData(tmp, srcW, srcH), 0, 0);
  const d = document.createElement('canvas');
  d.width = dstW;
  d.height = dstH;
  const dCtx = d.getContext('2d', { willReadFrequently: true })!;
  dCtx.imageSmoothingEnabled = true;
  dCtx.imageSmoothingQuality = 'high';
  dCtx.drawImage(c, 0, 0, dstW, dstH);
  const dstData = dCtx.getImageData(0, 0, dstW, dstH).data;
  const result = new Float32Array(dstW * dstH);
  for (let i = 0; i < result.length; i++) result[i] = dstData[i * 4] / 255;
  return result;
}

/**
 * Separable box blur over the RGB planes of an RGBA buffer (alpha is kept
 * verbatim). O(w·h) regardless of radius and equivalent to the clamped
 * neighborhood average used before, with edge windows naturally shorter.
 */
function boxBlurRGB(src: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const strip = new Uint8ClampedArray(w * h * 3);

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let c = 0; c < 3; c++) {
      const hi = Math.min(radius, w - 1);
      let sum = 0;
      for (let d = 0; d <= hi; d++) sum += src[((rowOff + d) << 2) + c];
      let len = hi + 1;
      strip[rowOff * 3 + c] = sum / len;
      for (let x = 1; x < w; x++) {
        if (x + radius < w) { sum += src[((rowOff + x + radius) << 2) + c]; len++; }
        if (x - radius > 0) { sum -= src[((rowOff + x - radius - 1) << 2) + c]; len--; }
        strip[(rowOff + x) * 3 + c] = sum / len;
      }
    }
  }

  const rowBytes = w * 3;
  const colSums = new Int32Array(rowBytes);
  const out = new Uint8ClampedArray(w * h * 4);
  const hi = Math.min(radius, h - 1);
  for (let d = 0; d <= hi; d++) {
    const off = d * rowBytes;
    for (let i = 0; i < rowBytes; i++) colSums[i] += strip[off + i];
  }
  let rows = hi + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * (w << 2) + (x << 2);
      const s3 = x * 3;
      out[o] = colSums[s3] / rows;
      out[o + 1] = colSums[s3 + 1] / rows;
      out[o + 2] = colSums[s3 + 2] / rows;
      out[o + 3] = 255;
    }
    if (y + radius + 1 < h) {
      const off = (y + radius + 1) * rowBytes;
      for (let i = 0; i < rowBytes; i++) colSums[i] += strip[off + i];
      rows++;
    }
    if (y - radius >= 0) {
      const off = (y - radius) * rowBytes;
      for (let i = 0; i < rowBytes; i++) colSums[i] -= strip[off + i];
      rows--;
    }
  }
  return out;
}

/**
 * Multi-step enhancement pipeline over a raw RGBA buffer. Worker-safe: it
 * never touches `document` or the Canvas 2D context filter, so it runs
 * identically on an OffscreenCanvas inside `postprocess.worker.ts`.
 * Mutates `data` in place (50 = neutral baseline for every level).
 */
export function enhanceImageDataBuffer(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  options: EnhancementOptions
): void {
  const clamp = (value: number) =>
    Math.max(0, Math.min(255, value));

  const resolveLevel = (valA: unknown, valB: unknown, fallback = 50): number => {
    if (typeof valA === 'number') return valA;
    if (typeof valB === 'number') return valB;
    return fallback;
  };

  const noiseVal = resolveLevel(options.denoise, options.removeNoiseLevel);
  const faceVal = resolveLevel(options.faceEnhancement, options.faceRestoreLevel);
  const colorVal = resolveLevel(options.colorLevel, (options as any).colorEnhanceLevel);
  const hdrVal = resolveLevel(options.hdrLevel, (options as any).hdrBoostLevel);
  const sharpVal = resolveLevel(options.sharpness, options.sharpenLevel);

  const brightness =
    typeof options.brightness === 'number' ? options.brightness : 50;

  const contrast =
    typeof options.contrast === 'number' ? options.contrast : 50;

  // ---------------------------------------------------------
  // 1. DENOISE — separable box blend, controlled by removeNoiseLevel.
  // ---------------------------------------------------------

  if (options.removeNoise !== false && noiseVal > 50) {
    const strength = (noiseVal - 50) / 50;
    const radius = strength > 0.66 ? 2 : 1;
    const blurred = boxBlurRGB(data, w, h, radius);
    const keep = 1 - strength;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = keep * data[i] + strength * blurred[i];
      data[i + 1] = keep * data[i + 1] + strength * blurred[i + 1];
      data[i + 2] = keep * data[i + 2] + strength * blurred[i + 2];
    }
  }

  // ---------------------------------------------------------
  // 2. FACE ENHANCEMENT — lightweight skin-tone balancing, not an AI model.
  // ---------------------------------------------------------

  if (options.faceRestore !== false && faceVal > 50) {
    const strength = (faceVal - 50) / 50;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const isSkin =
        r > 60 &&
        g > 35 &&
        b > 20 &&
        r > g &&
        r > b &&
        (r - b) > 15;

      if (!isSkin) continue;

      data[i] = clamp(r + (255 - r) * 0.035 * strength);
      data[i + 1] = clamp(g + (255 - g) * 0.018 * strength);
      data[i + 2] = clamp(b + (255 - b) * 0.008 * strength);
    }
  }

  // ---------------------------------------------------------
  // 3. COLOR ENHANCEMENT — saturation, 1.0 at 50%.
  // ---------------------------------------------------------

  if ((options.colorEnhance || colorVal !== 50) && colorVal !== 50) {
    const strength = (colorVal - 50) / 50;
    const saturation = 1 + 0.4 * strength;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      data[i] = clamp(luminance + (r - luminance) * saturation);
      data[i + 1] = clamp(luminance + (g - luminance) * saturation);
      data[i + 2] = clamp(luminance + (b - luminance) * saturation);
    }
  }

  // ---------------------------------------------------------
  // 4. HDR / LOCAL CONTRAST — smooth S-curve.
  // ---------------------------------------------------------

  if ((options.hdrBoost || hdrVal !== 50) && hdrVal > 50) {
    const strength = (hdrVal - 50) / 50;
    const hdrAmount = 1 + 0.35 * strength;

    for (let i = 0; i < data.length; i += 4) {
      const r = 0.5 + (data[i] / 255 - 0.5) * hdrAmount;
      const g = 0.5 + (data[i + 1] / 255 - 0.5) * hdrAmount;
      const b = 0.5 + (data[i + 2] / 255 - 0.5) * hdrAmount;

      data[i] = clamp(r * 255);
      data[i + 1] = clamp(g * 255);
      data[i + 2] = clamp(b * 255);
    }
  }

  // ---------------------------------------------------------
  // 5. BRIGHTNESS — 50 = original.
  // ---------------------------------------------------------

  if (brightness !== 50) {
    const brightnessOffset = ((brightness - 50) / 50) * 35;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(data[i] + brightnessOffset);
      data[i + 1] = clamp(data[i + 1] + brightnessOffset);
      data[i + 2] = clamp(data[i + 2] + brightnessOffset);
    }
  }

  // ---------------------------------------------------------
  // 6. CONTRAST — bounded to 0.55..1.45 to keep the dynamic range.
  // ---------------------------------------------------------

  if (contrast !== 50) {
    const contrastFactor = 1 + ((contrast - 50) / 50) * 0.45;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(128 + (data[i] - 128) * contrastFactor);
      data[i + 1] = clamp(128 + (data[i + 1] - 128) * contrastFactor);
      data[i + 2] = clamp(128 + (data[i + 2] - 128) * contrastFactor);
    }
  }

  // ---------------------------------------------------------
  // 7. SHARPENING — unsharp mask against a radius-1 box blur.
  // ---------------------------------------------------------

  if (options.sharpen !== false && sharpVal > 50) {
    const strength = (sharpVal - 50) / 50;
    const amount = 0.35 + 1.15 * strength;
    const blurred = boxBlurRGB(data, w, h, 1);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(data[i] + (data[i] - blurred[i]) * amount);
      data[i + 1] = clamp(data[i + 1] + (data[i + 1] - blurred[i + 1]) * amount);
      data[i + 2] = clamp(data[i + 2] + (data[i + 2] - blurred[i + 2]) * amount);
    }
  }
}

/** Wraps enhanceImageDataBuffer for (HTML)Canvas sources on the main thread. */
export function applyCanvasEnhancements(
  canvas: HTMLCanvasElement,
  options: EnhancementOptions
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  enhanceImageDataBuffer(imgData.data, canvas.width, canvas.height, options);
  ctx.putImageData(imgData, 0, 0);
}

export function upscaleWithCanvas(
  img: HTMLImageElement,
  scale: number
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const width = Math.round((img.naturalWidth || img.width) * scale);
  const height = Math.round((img.naturalHeight || img.height) * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  return {
    rgba: imgData.data,
    width,
    height,
  };
}