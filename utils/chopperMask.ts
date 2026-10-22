/**
 * chopperMask.ts — browser side of the optional "Cloud (CPU)" Chopper engine.
 *
 * The cloud engine is a *mask* service, not a cutout service:
 *
 *   1. the photo is drawn into a 512x512 canvas and packed as raw RGB
 *      (786 432 bytes) — the same 512x512 the model was trained on;
 *   2. the raw RGB is POSTed to /api/bg-remove, which answers with a
 *      512x512 alpha mask (262 144 bytes);
 *   3. the mask is scaled back up and composited over the *original* pixels
 *      in the browser.
 *
 * Consequences that matter: the full-resolution photo never leaves the
 * device, the exported cutout keeps the original resolution, and both
 * payloads stay far below Vercel's 4.5 MB request/response body cap.
 */

/** The model is a fixed-resolution segmenter. */
export const CHOPPER_SIZE = 512;
export const CHOPPER_RGB_BYTES = CHOPPER_SIZE * CHOPPER_SIZE * 3;
export const CHOPPER_MASK_BYTES = CHOPPER_SIZE * CHOPPER_SIZE;

export const CHOPPER_ENDPOINT = '/api/bg-remove';
export const CHOPPER_HEALTH_ENDPOINT = '/api/health';

/** Load an image element from a URL (object URL, data URL or remote file). */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be read.'));
    image.src = src;
  });
}

/**
 * Draw the image into a 512x512 canvas and pack it as raw RGB bytes.
 * The browser's own resampling is used on purpose: it is exactly what the
 * on-device pipeline uses for its own 512x512 downscale, so both engines
 * see the same pixels.
 */
export function encodeChopperThumbnail(image: HTMLImageElement): Uint8Array<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = CHOPPER_SIZE;
  canvas.height = CHOPPER_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create a 2D canvas context.');
  ctx.drawImage(image, 0, 0, CHOPPER_SIZE, CHOPPER_SIZE);
  const { data } = ctx.getImageData(0, 0, CHOPPER_SIZE, CHOPPER_SIZE);
  const rgb = new Uint8Array(CHOPPER_RGB_BYTES);
  for (let i = 0, j = 0; i < CHOPPER_RGB_BYTES; i += 3, j += 4) {
    rgb[i] = data[j];
    rgb[i + 1] = data[j + 1];
    rgb[i + 2] = data[j + 2];
  }
  return rgb;
}

/** POST the thumbnail and return the raw 512x512 alpha mask. */
export async function requestChopperMask(
  rgb: Uint8Array<ArrayBuffer>,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const response = await fetch(CHOPPER_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: rgb,
    signal,
    // `trailingSlash: true` makes the dev server answer "/api/bg-remove"
    // with a 308 to "/api/bg-remove/". The redirect is followed here so the
    // request keeps its POST body and the answer is the function's, not a
    // redirect page.
    redirect: 'follow',
  });

  if (!response.ok) {
    // 404/405: the origin answers but does not serve the function.
    // 501: a plain static host (e.g. `python -m http.server`) answers POST
    // with "Not Implemented" — also a missing function, not a broken one.
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      throw new Error(
        'The cloud engine is not mounted on this server (HTTP ' +
          `${response.status}). Start it with “npm run dev” and reload, or ` +
          'use the deployed site.'
      );
    }
    let message = `The cloud engine failed (HTTP ${response.status}).`;
    try {
      const payload = await response.json();
      if (payload && payload.error === 'model_warming_up') {
        message =
          'The cloud engine is still starting up — the first request on a fresh ' +
          'instance downloads the model. Try again in a few seconds.';
      } else if (payload && typeof payload.message === 'string') {
        message = payload.message;
      }
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== CHOPPER_MASK_BYTES) {
    throw new Error(
      `The cloud engine returned an unexpected mask (${buffer.byteLength} bytes).`
    );
  }
  return new Uint8Array(buffer);
}

/**
 * Composite the 512x512 mask over the original image and return a
 * transparent PNG at the original resolution.
 */
export async function compositeChopperMask(
  image: HTMLImageElement,
  mask: Uint8Array
): Promise<Blob> {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('The image has no dimensions.');

  // 1. Mask canvas: white silhouette whose alpha carries the segmentation.
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = CHOPPER_SIZE;
  maskCanvas.height = CHOPPER_SIZE;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Could not create a 2D canvas context.');
  const maskImage = maskCtx.createImageData(CHOPPER_SIZE, CHOPPER_SIZE);
  for (let i = 0; i < CHOPPER_MASK_BYTES; i += 1) {
    const offset = i * 4;
    maskImage.data[offset] = 255;
    maskImage.data[offset + 1] = 255;
    maskImage.data[offset + 2] = 255;
    maskImage.data[offset + 3] = mask[i];
  }
  maskCtx.putImageData(maskImage, 0, 0);

  // 2. Scale the mask to the original resolution (bilinear, like the
  //    on-device pipeline does when it resizes its mask).
  const scaledMask = document.createElement('canvas');
  scaledMask.width = width;
  scaledMask.height = height;
  const scaledCtx = scaledMask.getContext('2d');
  if (!scaledCtx) throw new Error('Could not create a 2D canvas context.');
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = 'high';
  scaledCtx.drawImage(maskCanvas, 0, 0, width, height);

  // 3. Keep the original pixels where the mask is opaque.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a 2D canvas context.');
  ctx.drawImage(image, 0, 0, width, height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(scaledMask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size === 0) {
        reject(new Error('The cloud cutout could not be encoded.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}
