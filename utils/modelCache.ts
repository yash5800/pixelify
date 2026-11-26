import { RUNTIME_CACHE } from './runtime';

// 'litert-upscaler-models' → upscaler LiteRT weights (Vitality/Pixel-Dance/Alpha-Satoru)
// 'transformers-cache' → BG remover weights (Chopper) + transformers.js artifacts
// 'ort-runtime' → legacy runtime blobs; cleared during model reset
const MODEL_CACHE_NAMES = ['litert-upscaler-models-v2', 'litert-upscaler-models', 'onnx-models', 'transformers-cache', RUNTIME_CACHE] as const;
const MODEL_CACHE_CHANNEL = 'pixelify-model-cache';
const CACHE_CLIENT_ID = `${Date.now()}-${Math.random()}`;
/**
 * After the user clears downloaded models we must not immediately fetch them
 * again from a route preload, hover warmup or upload preload. The flag is
 * persisted so a reload also waits for a real processing request, and it is
 * lifted by the explicit upscale / background-removal paths.
 */
const MODEL_AUTO_DOWNLOAD_KEY = 'pixelify:models-cleared:v1';
let autoDownloadSuppressedInMemory = false;
/** Matches model weight URLs that an older service worker may have cached. */
const MODEL_URL_PATTERN = /\/models\/|\.(tflite|onnx|onnx_data|safetensors|bin)(\?|$)/i;
export type ModelCacheClearedSource = 'self' | 'other';
const modelCacheSubscribers = new Set<(source: ModelCacheClearedSource) => void>();
const modelCacheChannel = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel(MODEL_CACHE_CHANNEL);

modelCacheChannel?.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type !== 'cleared' || event.data?.source === CACHE_CLIENT_ID) return;
  modelCacheSubscribers.forEach((subscriber) => subscriber('other'));
});

export function subscribeToModelCacheCleared(subscriber: (source: ModelCacheClearedSource) => void): () => void {
  modelCacheSubscribers.add(subscriber);
  return () => modelCacheSubscribers.delete(subscriber);
}

/** True while automatic model prefetching should stay paused after a clear. */
export function isModelAutoDownloadSuppressed(): boolean {
  if (autoDownloadSuppressedInMemory) return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MODEL_AUTO_DOWNLOAD_KEY) === '1';
  } catch {
    return false;
  }
}

/** Pause automatic model downloads until an explicit processing request. */
export function suppressModelAutoDownload(): void {
  autoDownloadSuppressedInMemory = true;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MODEL_AUTO_DOWNLOAD_KEY, '1');
  } catch {
    /* storage can be unavailable in private mode; memory flag still holds */
  }
}

/** Resume normal prefetching; called only when the user actually processes. */
export function allowModelAutoDownload(): void {
  autoDownloadSuppressedInMemory = false;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MODEL_AUTO_DOWNLOAD_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Older builds let the service worker write model weights into its app-shell
 * cache. Deleting only the dedicated model buckets left those copies behind,
 * so the next load was served from the SW cache instead of re-downloading.
 */
async function purgeModelEntriesFromCache(cacheName: string): Promise<void> {
  const cache = await caches.open(cacheName).catch(() => null);
  if (!cache) return;
  const requests = await cache.keys().catch(() => []);
  await Promise.all(
    requests
      .filter((request) => MODEL_URL_PATTERN.test(request.url))
      .map((request) => cache.delete(request).catch(() => false))
  );
}

export async function clearDownloadedModelCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    throw new Error('This browser does not support clearing model storage.');
  }

  const allCacheNames = await caches.keys().catch(() => []);
  const toDelete = new Set<string>([
    ...MODEL_CACHE_NAMES,
    ...allCacheNames.filter((name) => /model|transformer|onnx|litert|runtime/i.test(name)),
  ]);

  await Promise.all(Array.from(toDelete).map((name) => caches.delete(name).catch(() => false)));

  // Sweep model weights out of caches we intentionally keep (app shell, etc.).
  const remainingCaches = (await caches.keys().catch(() => []))
    .filter((name) => !toDelete.has(name));
  await Promise.all(remainingCaches.map(purgeModelEntriesFromCache));

  console.log('[Pixelify Model Cache] 🧹 Purged model caches:', Array.from(toDelete).join(', '));
  // Keep the caches empty until the user actually asks to process an image.
  // Without this, route preloads, hover warmups and upload preloads would
  // immediately refetch everything the user just deleted.
  suppressModelAutoDownload();
  modelCacheChannel?.postMessage({ type: 'cleared', source: CACHE_CLIENT_ID });
  // BroadcastChannel does not deliver a message to the context that posted it,
  // so notify this tab's subscribers directly.
  modelCacheSubscribers.forEach((subscriber) => subscriber('self'));
}

export async function hasAnyCachedModels(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof caches === 'undefined') return false;
  try {
    const allCacheNames: string[] = (await caches.keys().catch(() => [])) as string[];
    const existingCacheSet = new Set(allCacheNames);
    const targetCacheNames = new Set<string>([
      ...MODEL_CACHE_NAMES,
      ...allCacheNames.filter((name) => /model|transformer|onnx|litert/i.test(name)),
    ]);

    for (const name of targetCacheNames) {
      if (!existingCacheSet.has(name)) continue;
      const cache = await caches.open(name).catch(() => null);
      if (!cache) continue;
      const requests = await cache.keys().catch(() => []);
      if (requests.length === 0) continue;

      for (const req of requests) {
        const url = (req.url || '').toLowerCase();
        if (
          MODEL_URL_PATTERN.test(url) ||
          url.includes('.tflite') ||
          url.includes('.onnx') ||
          url.includes('.safetensors') ||
          url.includes('.bin') ||
          url.includes('birefnet') ||
          url.includes('diablo') ||
          url.includes('chopper') ||
          (name !== RUNTIME_CACHE && !url.endsWith('.js') && !url.endsWith('.wasm'))
        ) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function isDiabloModelCached(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open('onnx-models');
    const localMatch = (await cache.match('https://huggingface.co/Joker5800/pixelify/resolve/main/Diablo.onnx')) ||
      (await cache.match('/models/Diablo.onnx')) ||
      (await cache.match(new URL('/models/Diablo.onnx', window.location.origin).toString()));
    if (localMatch) return true;

    const keys = await cache.keys();
    for (const req of keys) {
      if (req.url.toLowerCase().includes('diablo')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function requestPersistentModelStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}