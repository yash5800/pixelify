/**
 * Result frames captured from each model, used as the "after" side of the
 * studio's live comparison. The upscalers share one source frame and differ
 * only in the detail their pass resolves; the cutout models share the
 * headphone frame and differ in how clean the matte's edge is.
 *
 * The source captures live in public/home; the frames referenced here are the
 * same pixels compressed for the demo.
 */

export interface ModelResult {
  src: string;
  cutout: boolean;
}

export const MODEL_RESULTS: Record<string, ModelResult> = {
  Vitality: { src: '/home/results/vitality-4x.webp', cutout: false },
  'Pixel-Dance': { src: '/home/results/pixel-dance-4x.webp', cutout: false },
  'Alpha-Satoru': { src: '/home/results/alpha-satoru-4x.webp', cutout: false },
  Chopper: { src: '/home/results/chopper-cutout.webp', cutout: true },
  Diablo: { src: '/home/results/diablo-cutout.webp', cutout: true },
};

const FALLBACK_UPSCALE = '/home/studio/live-up-after.jpg';
const FALLBACK_CUTOUT = '/home/studio/live-cut-after.webp';

/** The result frame for a model, with the neutral demo frame as a fallback. */
export function resultFor(model: string, cutout = false) {
  return MODEL_RESULTS[model]?.src ?? (cutout ? FALLBACK_CUTOUT : FALLBACK_UPSCALE);
}
