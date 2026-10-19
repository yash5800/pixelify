import { RUNTIME_CACHE } from './runtime';

// 'onnx-models' → upscaler ONNX weights (Vitality/Pixel-Dance/Alpha-Satoru)
// 'transformers-cache' → BG remover weights (Chopper) + transformers.js artifacts
// 'ort-runtime' → cached ORT / transformers.js runtime blob URLs
const MODEL_CACHE_NAMES = ['onnx-models', 'transformers-cache', RUNTIME_CACHE] as const;
const MODEL_CACHE_CHANNEL = 'pixelify-model-cache';
const CACHE_CLIENT_ID = `${Date.now()}-${Math.random()}`;
const modelCacheSubscribers = new Set<() => void>();
const modelCacheChannel = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel(MODEL_CACHE_CHANNEL);

modelCacheChannel?.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type !== 'cleared' || event.data?.source === CACHE_CLIENT_ID) return;
  modelCacheSubscribers.forEach((subscriber) => subscriber());
});

export function subscribeToModelCacheCleared(subscriber: () => void): () => void {
  modelCacheSubscribers.add(subscriber);
  return () => modelCacheSubscribers.delete(subscriber);
}

export async function clearDownloadedModelCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    throw new Error('This browser does not support clearing model storage.');
  }

  await Promise.all(MODEL_CACHE_NAMES.map((name) => caches.delete(name)));
  modelCacheChannel?.postMessage({ type: 'cleared', source: CACHE_CLIENT_ID });
}

export async function requestPersistentModelStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}