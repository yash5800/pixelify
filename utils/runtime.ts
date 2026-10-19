/**
 * Shared runtime constants + helpers for the two AI runtimes:
 * ONNX Runtime Web (upscaler) and Transformers.js (background remover).
 * Both are loaded from the CDN once, cached in the Cache API keyed by
 * version, and afterwards imported as same-origin blob URLs so repeat
 * visits never touch the CDN again.
 */

export const ORT_VERSION = '1.19.2';
export const ORT_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.all.bundle.min.mjs`;

export const TRANSFORMERS_VERSION = '4.2.0';
export const TRANSFORMERS_CDN = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/transformers.min.js`;

export const RUNTIME_CACHE = 'ort-runtime';

/**
 * Runtime modules can't touch the Cache API from inside a module worker, so
 * the main thread resolves a blob URL for the bundle once and hands it over.
 * The store is keyed by version so app upgrades re-fetch automatically.
 */
export async function getCachedRuntimeBlobUrl(
  scriptUrl: string,
  versionKey: string,
  cacheName = RUNTIME_CACHE
): Promise<string | undefined> {
  try {
    if (typeof caches === 'undefined' || typeof importScripts === 'function') return undefined;
    const cache = await caches.open(cacheName);
    const key = `${versionKey}:${scriptUrl}`;
    let stored = await cache.match(key);
    if (!stored || !stored.ok) {
      const res = await fetch(scriptUrl, { mode: 'cors' });
      if (!res.ok) return undefined;
      const body = await res.arrayBuffer();
      if (!body.byteLength) return undefined;
      await cache.put(key, new Response(body));
      stored = await cache.match(key);
      if (!stored) return undefined;
    }
    const bytes = await stored.arrayBuffer();
    if (!bytes.byteLength) return undefined;
    const blob = new Blob([bytes], { type: 'text/javascript' });
    return URL.createObjectURL(blob);
  } catch {
    return undefined;
  }
}

/** Dynamic import of a same-origin blob URL (or any URL) bypassing the bundler. */
export const nativeImport = new Function('u', 'return import(u)') as (
  url: string
) => Promise<any>;
