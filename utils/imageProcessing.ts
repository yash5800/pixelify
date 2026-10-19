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
 * Applies multi-step canvas post-processing filters based on selected enhancement cards
 */


export function applyCanvasEnhancements(
  canvas: HTMLCanvasElement,
  options: EnhancementOptions
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const clamp = (value: number) =>
    Math.max(0, Math.min(255, value));

  const resolveLevel = (valA: unknown, valB: unknown, fallback = 50): number => {
    if (typeof valA === 'number') return valA;
    if (typeof valB === 'number') return valB;
    return fallback;
  };

  // ---------------------------------------------------------
  // Levels (50 = Neutral Baseline / Pure AI output)
  // ---------------------------------------------------------

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
  // 1. DENOISE
  // ---------------------------------------------------------
  //
  // Simple browser-friendly neighborhood blur.
  // Strength is controlled by removeNoiseLevel.
  if (options.removeNoise !== false && noiseVal > 50) {
    const strength = (noiseVal - 50) / 50;

    const source = new Uint8ClampedArray(data);

    const radius = strength > 0.66 ? 2 : 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const index = (y * w + x) * 4;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (
          let dy = -radius;
          dy <= radius;
          dy++
        ) {
          const py = y + dy;

          if (py < 0 || py >= h) continue;

          for (
            let dx = -radius;
            dx <= radius;
            dx++
          ) {
            const px = x + dx;

            if (px < 0 || px >= w) continue;

            const neighbor =
              (py * w + px) * 4;

            r += source[neighbor];
            g += source[neighbor + 1];
            b += source[neighbor + 2];

            count++;
          }
        }

        const avgR = r / count;
        const avgG = g / count;
        const avgB = b / count;

        data[index] =
          source[index] * (1 - strength) +
          avgR * strength;

        data[index + 1] =
          source[index + 1] * (1 - strength) +
          avgG * strength;

        data[index + 2] =
          source[index + 2] * (1 - strength) +
          avgB * strength;
      }
    }
  }

  // ---------------------------------------------------------
  // 2. FACE ENHANCEMENT
  // ---------------------------------------------------------
  //
  // Lightweight skin-tone enhancement.
  // This is NOT an AI face-restoration model.
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

      // Gentle skin-tone balancing
      data[i] = clamp(
        r + (255 - r) * 0.035 * strength
      );

      data[i + 1] = clamp(
        g + (255 - g) * 0.018 * strength
      );

      data[i + 2] = clamp(
        b + (255 - b) * 0.008 * strength
      );
    }
  }

  // ---------------------------------------------------------
  // 3. COLOR ENHANCEMENT
  // ---------------------------------------------------------

  if ((options.colorEnhance || colorVal !== 50) && colorVal !== 50) {
    const strength = (colorVal - 50) / 50;

    // 1.0 at 50%
    // ~1.40 at 100%, ~0.6 at 0%
    const saturation = 1 + 0.4 * strength;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const luminance =
        0.299 * r +
        0.587 * g +
        0.114 * b;

      data[i] = clamp(
        luminance + (r - luminance) * saturation
      );

      data[i + 1] = clamp(
        luminance + (g - luminance) * saturation
      );

      data[i + 2] = clamp(
        luminance + (b - luminance) * saturation
      );
    }
  }

  // ---------------------------------------------------------
  // 4. HDR / LOCAL CONTRAST
  // ---------------------------------------------------------

  if ((options.hdrBoost || hdrVal !== 50) && hdrVal > 50) {
    const strength = (hdrVal - 50) / 50;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      // Smooth S-curve.
      const hdrAmount = 1 + 0.35 * strength;

      r = 0.5 + (r - 0.5) * hdrAmount;
      g = 0.5 + (g - 0.5) * hdrAmount;
      b = 0.5 + (b - 0.5) * hdrAmount;

      data[i] = clamp(r * 255);
      data[i + 1] = clamp(g * 255);
      data[i + 2] = clamp(b * 255);
    }
  }

  // ---------------------------------------------------------
  // 5. BRIGHTNESS
  // ---------------------------------------------------------
  //
  // 50 = original
  // 0  = darker
  // 100 = brighter
  //

  if (brightness !== 50) {
    const brightnessOffset = ((brightness - 50) / 50) * 35;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(data[i] + brightnessOffset);
      data[i + 1] = clamp(data[i + 1] + brightnessOffset);
      data[i + 2] = clamp(data[i + 2] + brightnessOffset);
    }
  }

  // ---------------------------------------------------------
  // 6. CONTRAST
  // ---------------------------------------------------------
  //
  // 50 = original
  // 0  = reduced contrast
  // 100 = increased contrast
  //

  if (contrast !== 50) {
    const normalized = (contrast - 50) / 50;
    // Bounded between 0.55 and 1.45: preserves dynamic range and details even at 0 contrast
    const contrastFactor = 1 + normalized * 0.45;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(128 + (data[i] - 128) * contrastFactor);
      data[i + 1] = clamp(128 + (data[i + 1] - 128) * contrastFactor);
      data[i + 2] = clamp(128 + (data[i + 2] - 128) * contrastFactor);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // ---------------------------------------------------------
  // 7. SHARPENING
  // ---------------------------------------------------------

  if (options.sharpen !== false && sharpVal > 50) {
    const strength = (sharpVal - 50) / 50;

    const amount =
      0.35 + 1.15 * strength;

    const tempCanvas =
      document.createElement('canvas');

    tempCanvas.width = w;
    tempCanvas.height = h;

    const tempCtx =
      tempCanvas.getContext('2d', { willReadFrequently: true })!;

    tempCtx.filter =
      'blur(1px)';

    tempCtx.drawImage(
      canvas,
      0,
      0
    );

    const original =
      ctx.getImageData(
        0,
        0,
        w,
        h
      );

    const blurred =
      tempCtx.getImageData(
        0,
        0,
        w,
        h
      );

    const orig = original.data;
    const blur = blurred.data;

    for (
      let i = 0;
      i < orig.length;
      i += 4
    ) {
      orig[i] = clamp(
        orig[i] +
        (orig[i] - blur[i]) *
        amount
      );

      orig[i + 1] = clamp(
        orig[i + 1] +
        (orig[i + 1] - blur[i + 1]) *
        amount
      );

      orig[i + 2] = clamp(
        orig[i + 2] +
        (orig[i + 2] - blur[i + 2]) *
        amount
      );
    }

    ctx.putImageData(
      original,
      0,
      0
    );
  }
}

export function upscaleWithCanvas(
  img: HTMLImageElement,
  scale: number,
  options?: EnhancementOptions
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

  if (options) {
    applyCanvasEnhancements(canvas, options);
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  return {
    rgba: imgData.data,
    width,
    height,
  };
}