/// <reference lib="webworker" />

// Transformers.js is loaded at runtime from the CDN (same distribution method
// the app already uses for ONNX Runtime Web). This keeps the bundler from
// pulling the whole onnxruntime-web ESM/wasm asset graph into the worker chunk.
// The main thread pre-caches the bundle in the Cache API and hands a same-origin
// blob URL over via the INIT message, so warm visits never touch the CDN.
import { TRANSFORMERS_CDN, TRANSFORMERS_VERSION } from '../utils/runtime';

interface TransformersModule {
  pipeline: (task: string, model: string, options?: any) => Promise<any>;
  env: any;
}

const nativeImport = new Function('url', 'return import(url)') as (
  url: string
) => Promise<TransformersModule>;

let pipeline: TransformersModule['pipeline'] | undefined;
let env: TransformersModule['env'] | undefined;
let transformersLoading: Promise<void> | null = null;

async function loadTransformers(preferredUrl?: string): Promise<void> {
  if (env && pipeline) return;
  if (!transformersLoading) {
    transformersLoading = (async () => {
      const mod = await nativeImport(preferredUrl || TRANSFORMERS_CDN);
      pipeline = mod.pipeline;
      env = mod.env;

      // Model weights are fetched from the model repository; no local-model lookup.
      env.allowLocalModels = false;

      // If a custom model weights URL is provided (e.g. from NEXT_PUBLIC_HF_CHOPPER_MODEL),
      // intercept ONNX model fetches to stream the weights directly from that URL.
      const originalFetch = env.fetch || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined);
      if (originalFetch) {
        env.fetch = async (input: string | URL | Request, init?: any) => {
          const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href;
          if (modelUrlOverride && (urlStr.endsWith('.onnx') || urlStr.includes('onnx/model'))) {
            const cache = typeof caches !== 'undefined' ? await caches.open('transformers-cache').catch(() => null) : null;
            const cached = await cache?.match(modelUrlOverride);
            if (cached) {
              const isHf = modelUrlOverride.includes('huggingface.co');
              console.log(`[Pixelify BG] Loaded Chopper model from ${isHf ? 'Hugging Face' : 'public/models'} (Browser Cache): ${modelUrlOverride}`);
              return cached;
            }

            const isHf = modelUrlOverride.includes('huggingface.co');
            console.log(`[Pixelify BG] Downloading Chopper model from ${isHf ? 'Hugging Face' : 'public/models'}: ${modelUrlOverride}`);
            const res = await originalFetch(modelUrlOverride, init);
            if (res.ok && cache) {
              console.log(`[Pixelify BG] Successfully downloaded and cached Chopper model from ${isHf ? 'Hugging Face' : 'public/models'}`);
              try {
                await cache.put(modelUrlOverride, res.clone());
              } catch { /* best effort */ }
            }
            return res;
          }
          if (urlStr.endsWith('.onnx') || urlStr.includes('onnx/model')) {
            const isHf = urlStr.includes('huggingface.co');
            console.log(`[Pixelify BG] Downloading background remover model from ${isHf ? 'Hugging Face' : 'public/models'}: ${urlStr}`);
          }
          return originalFetch(input, init);
        };
      }

      // Tune ORT WASM threading: multi-thread only when crossOriginIsolated.
      const onnxEnv = env.backends?.onnx;
      if (onnxEnv?.wasm) {
        const cores = (self.navigator as any)?.hardwareConcurrency ?? 4;
        const isolated = (self as any).crossOriginIsolated === true;
        onnxEnv.wasm.numThreads = isolated ? Math.min(4, cores) : 1;
      }
    })();
  }
  await transformersLoading;
}

type Engine = 'webgpu' | 'wasm';
type BgModelKey = 'chopper' | 'diablo';
type WorkerMessage = {
  type?: string;
  id?: string | number;
  url?: string;
  model?: BgModelKey;
  forceWasm?: boolean;
  /** Same-origin blob URL for the transformers.js runtime (main-thread cache). */
  runtimeUrl?: string;
  /** Optional custom model URL from env (e.g. Hugging Face resolve URL for Chopper). */
  modelUrl?: string;
  /** Optional custom model URL from env (e.g. Hugging Face resolve URL for Diablo). */
  diabloModelUrl?: string;
};

const MODEL_ID = 'studioludens/birefnet-lite-512';
const GPU_PROBE_TIMEOUT_MS = 3500;

/* ============================================================
   DIABLO — BEN2-family ultra-precision matting network.
   Runs as a raw ONNX model through onnxruntime-web from CDN.
   Pinned to the exact ORT snapshot transformers.js 4.2.0 ships
   with, so both runtimes share the same engine generation.
   ============================================================ */
const ORT_VERSION = '1.26.0-dev.20260416-b7804b056c';
const ORT_BASE_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const ORT_BUNDLE_URL = `${ORT_BASE_CDN}ort.webgpu.bundle.min.mjs`;
const DEFAULT_DIABLO_MODEL_URL = '/models/Diablo.onnx';
const DIABLO_MODEL_CACHE = 'onnx-models';
const DIABLO_INPUT_SIZE = 1024;
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

/** Set from the INIT message: same-origin blob URL for transformers.js. */
let runtimeUrlOverride: string | undefined;
let modelUrlOverride: string | undefined;
let diabloModelUrlOverride: string | undefined;

/**
 * True when a WebGPU pipeline was used (or attempted) for inference in this
 * worker's lifetime. Once a WebGPU device faults (device lost, buffer mapping
 * failure, OOM), ORT's WebGPU state stays poisoned for this worker, so any
 * subsequent suspicious error must be treated as an engine fault that only a
 * full worker restart + fresh forceWasm worker can recover from.
 */
let webgpuTouched = false;

/** Broad detection of WebGPU engine faults (device lost, OrtRun buffer mapping, OOM...). */
function looksLikeWebgpuFault(message: string): boolean {
  return /webgpu|invalid buffer|device lost|out of memory|buffer mapping|mapping webgpu/i.test(message);
}

const worker = self as DedicatedWorkerGlobalScope;
const post = (message: Record<string, unknown>) => worker.postMessage(message);

/**
 * Conservative mobile device detection within Web Worker environment.
 * Note: window, document, and matchMedia are NOT available in Web Workers.
 * Mobile WebGPU often crashes the browser process outright with uncatchable OOM;
 * forcing WASM (Standard) on mobile ensures rock-solid stability.
 */
function isMobileDevice(): boolean {
  const nav = (worker.navigator || self.navigator) as any;
  if (!nav) return false;

  // 1. Modern Client Hints (e.g. Chrome on Android)
  if (nav.userAgentData?.mobile === true) return true;

  const ua = nav.userAgent || '';

  // 2. Mobile User-Agent tokens
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua)) {
    return true;
  }

  // 3. iPad on iOS 13+ (reports as Macintosh desktop UA, but has multi-touch points)
  if (/Macintosh/i.test(ua) && typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints > 1) {
    return true;
  }

  // 4. Low device memory indicator (<= 3GB RAM is mobile / low-spec)
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 3) {
    return true;
  }

  return false;
}

let removerPromise: Promise<any> | null = null;
let chosenEngine: Engine | null = null;
let preferredEngine: Engine | null = null;
let webgpuAvailable = false;
let lastWebgpuError: string | null = null;
let initStartedAt = 0;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Unknown error';
}

function postStatus(stage: string, extra: Record<string, unknown> = {}) {
  post({ type: 'STATUS', stage, engine: chosenEngine, ...extra });
}

function progressCallback(event: any) {
  // Transformers.js emits progress events while downloading model files. Keep
  // this distinct from model compilation/initialization, which has no % callback.
  if (event?.status === 'progress') {
    const total = Number(event.total || 0);
    const loaded = Number(event.loaded || 0);
    const file = String(event.file || '');
    // Transformers.js downloads several config files (<1MB) and the actual model weights (>5MB or .onnx)
    const isWeights = file.endsWith('.onnx') || total > 5 * 1024 * 1024;
    const progress = total > 0 ? Math.max(0, Math.min(100, Math.round((loaded / total) * 100))) : null;
    post({
      type: 'PROGRESS',
      stage: 'model-download',
      ...(progress === null ? {} : { progress }),
      file: event.file,
      loaded,
      total: total || null,
      isWeights,
      model: 'chopper',
    });
  } else if (event?.status) {
    post({ type: 'STATUS', stage: String(event.status), detail: event.file, model: 'chopper' });
  }
}

/**
 * A time-bounded WebGPU probe. requestAdapter() alone can report an adapter
 * even when device creation is not possible, so also try requestDevice().
 * This is only a capability probe; pipeline initialization is the real test.
 */
async function detectWebGPU(timeoutMs = GPU_PROBE_TIMEOUT_MS): Promise<boolean> {
  const gpu = (worker.navigator as any)?.gpu;
  if (!gpu || typeof gpu.requestAdapter !== 'function') return false;

  let adapter: any = null;
  try {
    let adapterTimeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      adapter = await Promise.race([
        gpu.requestAdapter(),
        new Promise<null>((resolve) => {
          adapterTimeoutId = setTimeout(() => resolve(null), timeoutMs);
        }),
      ]);
    } finally {
      if (adapterTimeoutId !== undefined) clearTimeout(adapterTimeoutId);
    }
    if (!adapter) return false;

    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const devicePromise: Promise<any> = adapter.requestDevice();
    // If requestDevice resolves after the timeout, destroy the late probe device.
    void devicePromise.then((device) => {
      if (timedOut) {
        try { device?.destroy?.(); } catch { /* best effort */ }
      }
    }).catch(() => undefined);

    const device = await Promise.race([
      devicePromise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, timeoutMs);
      }),
    ]);
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (!device) return false;
    try { device.destroy?.(); } catch { /* probe cleanup is best effort */ }
    return true;
  } catch {
    return false;
  }
}

async function createPipeline(engine: Engine): Promise<any> {
  await loadTransformers(runtimeUrlOverride);
  const activeModel = modelUrlOverride ? 'Chopper (Custom Hugging Face)' : MODEL_ID;
  postStatus('loading-model', { requestedEngine: engine, model: activeModel });
  return pipeline!('background-removal', MODEL_ID, {
    device: engine,
    dtype: 'fp32',
    progress_callback: progressCallback,
  } as any);
}

/** Best-effort release. Transformers.js versions differ in which object exposes dispose(). */
async function disposePipeline(remover: any): Promise<void> {
  if (!remover) return;
  try {
    if (typeof remover.dispose === 'function') {
      await remover.dispose();
    }
  } catch { /* best effort */ }
  try {
    if (typeof remover.model?.dispose === 'function') {
      await remover.model.dispose();
    }
  } catch { /* best effort */ }
  try {
    if (typeof remover.model?.session?.release === 'function') {
      await remover.model.session.release();
    }
  } catch { /* best effort */ }
  try {
    if (Array.isArray(remover.model?.sessions)) {
      for (const s of remover.model.sessions) {
        await s?.release?.();
      }
    }
  } catch { /* best effort */ }
  try {
    if (typeof remover.processor?.dispose === 'function') {
      await remover.processor.dispose();
    }
  } catch { /* best effort */ }
}

/** Complete release of Chopper (Transformers pipeline) from RAM */
async function disposeChopper(): Promise<void> {
  if (!removerPromise) return;
  console.log('[Pixelify BG Worker] 🧹 Unloading Chopper model from RAM...');
  const promise = removerPromise;
  removerPromise = null;
  chosenEngine = null;
  webgpuTouched = false;
  try {
    const remover = await promise;
    await disposePipeline(remover);
    console.log('[Pixelify BG Worker] 🗑️ Chopper model pipeline disposed and released from RAM.');
  } catch (err) {
    console.warn('[Pixelify BG Worker] Chopper dispose encountered error:', err);
  }
}

/**
 * Create WebGPU first, but never treat the probe as proof that this model works.
 * A failed WebGPU pipeline initialization is retried on WASM before giving up.
 * NOTE: deliberately does NOT modify preferredEngine — the engine intent is set
 * once in getRemover() so late-breaking WebGPU faults still classify correctly.
 */
async function createResilientPipeline(preferred: Engine): Promise<any> {
  if (preferred === 'webgpu') {
    postStatus('initializing-webgpu', { requestedEngine: 'webgpu' });
    try {
      const remover = await createPipeline('webgpu');
      chosenEngine = 'webgpu';
      lastWebgpuError = null;
      postStatus('ready', { engine: 'webgpu' });
      return remover;
    } catch (error) {
      lastWebgpuError = errorMessage(error);
      post({
        type: 'ENGINE_FALLBACK',
        from: 'webgpu',
        to: 'wasm',
        stage: 'initialization',
        reason: lastWebgpuError,
      });
      postStatus('initializing-wasm', { reason: lastWebgpuError });
    }
  } else {
    postStatus('initializing-wasm', { requestedEngine: 'wasm' });
  }

  const remover = await createPipeline('wasm');
  chosenEngine = 'wasm';
  postStatus('ready', { engine: 'wasm' });
  return remover;
}

async function getRemover(forceWasm = false): Promise<any> {
  // A manual WASM override must not silently reuse a previously-created GPU pipeline.
  if (forceWasm && removerPromise && chosenEngine === 'webgpu') {
    const oldPromise = removerPromise;
    removerPromise = null;
    chosenEngine = null;
    webgpuTouched = false;
    try { await disposePipeline(await oldPromise); } catch { /* ignore failed old init */ }
  }

  if (!removerPromise) {
    const promise = (async () => {
      const isMobile = isMobileDevice();
      const hasWebGpu = await detectWebGPU();
      webgpuAvailable = hasWebGpu;

      // Mobile devices enforce WASM (Standard CPU) to prevent uncatchable tab crashes/OOM
      const engine: Engine = (forceWasm || isMobile) ? 'wasm' : (hasWebGpu ? 'webgpu' : 'wasm');
      // The engine *intent* decides whether post-failure errors count as WebGPU
      // faults. Never overwrite it later (createResilientPipeline must not).
      preferredEngine = engine;
      const fallbackReason = isMobile && hasWebGpu
        ? 'Mobile device detected: using Standard (CPU) mode to prevent browser memory crashes.'
        : undefined;

      post({
        type: 'CAPABILITIES',
        engine,
        webgpuAvailable,
        forceWasm,
        isMobile,
        reason: fallbackReason,
      });
      return createResilientPipeline(engine);
    })();
    removerPromise = promise;
    try {
      return await promise;
    } catch (error) {
      // Do not cache rejected promises: a later INIT can retry.
      if (removerPromise === promise) removerPromise = null;
      chosenEngine = null;
      throw error;
    }
  }
  return removerPromise;
}

/**
 * If the GPU dies during inference (device lost, unsupported operator, driver
 * reset, memory pressure), replace the pipeline with WASM and retry this image
 * exactly once. WASM errors are surfaced rather than retried forever.
 */
async function runInference(inputBlob: Blob): Promise<any> {
  const remover = await getRemover();
  if (chosenEngine === 'webgpu') webgpuTouched = true;
  try {
    return await remover(inputBlob);
  } catch (error) {
    if (chosenEngine !== 'webgpu') throw error;

    lastWebgpuError = errorMessage(error);
    post({
      type: 'ENGINE_FALLBACK',
      from: 'webgpu',
      to: 'wasm',
      stage: 'inference',
      reason: lastWebgpuError,
    });
    postStatus('recovering-with-wasm', { reason: lastWebgpuError });

    try {
      await disposePipeline(remover);
      removerPromise = null;
      chosenEngine = null;
      const wasmRemover = await createResilientPipeline('wasm');
      removerPromise = Promise.resolve(wasmRemover);
      webgpuTouched = false;
      return await wasmRemover(inputBlob);
    } catch (fallbackError) {
      // The in-worker WASM recovery failed: the ORT runtime (or shared env) is
      // too damaged to recover here. Mark the error so the main thread
      // terminates this worker and recreates a fresh forceWasm worker.
      const err = fallbackError instanceof Error ? fallbackError : new Error(errorMessage(fallbackError));
      (err as any).engineFailed = true;
      throw err;
    }
  }
}

async function loadInputBlob(url: string): Promise<Blob> {
  if (typeof url !== 'string' || !url) throw new Error('REMOVE_BG requires a valid image URL.');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read input image (HTTP ${response.status}).`);
  const blob = await response.blob();
  if (!blob.size) throw new Error('The selected image is empty or could not be read.');
  return blob;
}

/* ============================================================
   DIABLO runtime (raw ORT session over BEN2 ONNX weights)
   ============================================================ */

let ortModulePromise: Promise<any> | null = null;

/** Import onnxruntime-web bundle and pin its WASM artifact paths. */
async function loadOrtRuntime(): Promise<any> {
  if (!ortModulePromise) {
    ortModulePromise = (async () => {
      const ort = await nativeImport(ORT_BUNDLE_URL) as any;
      const mod = ort.default ?? ort;
      if (mod?.env?.wasm) {
        mod.env.wasm.wasmPaths = {
          mjs: `${ORT_BASE_CDN}ort-wasm-simd-threaded.jsep.mjs`,
          wasm: `${ORT_BASE_CDN}ort-wasm-simd-threaded.jsep.wasm`,
        };
        const cores = (self.navigator as any)?.hardwareConcurrency ?? 4;
        const isolated = (self as any).crossOriginIsolated === true;
        mod.env.wasm.numThreads = isolated ? Math.min(4, cores) : 1;
        mod.env.logLevel = 'warning';
      }
      if (!mod?.InferenceSession?.create) {
        throw new Error('On-device runtime failed to initialize (ORT module incomplete).');
      }
      return mod;
    })().catch((error) => {
      ortModulePromise = null;
      throw error;
    });
  }
  return ortModulePromise;
}

interface DiabloModelSource {
  source: string | Uint8Array;
  cleanup?: () => void;
}

/** Fetch the Diablo weights, preferring the Cache API copy across visits with zero JS heap bloat. */
async function getDiabloModelSource(): Promise<DiabloModelSource> {
  const targetUrl = diabloModelUrlOverride || DEFAULT_DIABLO_MODEL_URL;
  const isAbsolute = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');
  const cacheUrl = isAbsolute ? targetUrl : new URL(targetUrl, self.location.origin).toString();

  console.log(`[Diablo Model] 🔍 Checking browser cache for weights: ${cacheUrl}`);

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(DIABLO_MODEL_CACHE);
      let cached = await cache.match(cacheUrl);
      if (!cached && cacheUrl !== DEFAULT_DIABLO_MODEL_URL) {
        cached = await cache.match(DEFAULT_DIABLO_MODEL_URL);
      }
      if (cached) {
        const ab = await cached.arrayBuffer();
        if (ab && ab.byteLength > 0) {
          const isHf = cacheUrl.includes('huggingface.co');
          console.log(`[Diablo Model] 📦 Cache Hit! Loaded Diablo model weights from browser cache: ${(ab.byteLength / (1024 * 1024)).toFixed(2)} MB (${isHf ? 'Hugging Face' : 'public/models'})`);
          return {
            source: new Uint8Array(ab),
          };
        }
      }
    } catch { /* cache unavailable; stream from network */ }
  }

  const isHf = targetUrl.includes('huggingface.co');
  console.log(`[Diablo Model] 🌐 Cache Miss. Downloading Diablo weights from: ${targetUrl} (${isHf ? 'Hugging Face' : 'public/models'})`);

  let response: Response;
  try {
    const res = await fetch(targetUrl);
    if (res.ok) {
      response = res;
    } else if (targetUrl !== DEFAULT_DIABLO_MODEL_URL) {
      console.warn(`[Diablo Model] ⚠️ Primary URL ${targetUrl} returned HTTP ${res.status}. Falling back to local ${DEFAULT_DIABLO_MODEL_URL}...`);
      response = await fetch(DEFAULT_DIABLO_MODEL_URL);
    } else {
      throw new Error(`Could not fetch Diablo weights (HTTP ${res.status}).`);
    }
  } catch (err: any) {
    if (targetUrl !== DEFAULT_DIABLO_MODEL_URL) {
      console.warn(`[Diablo Model] ⚠️ Primary URL ${targetUrl} failed (${err?.message}). Falling back to local ${DEFAULT_DIABLO_MODEL_URL}...`);
      response = await fetch(DEFAULT_DIABLO_MODEL_URL);
    } else {
      throw err;
    }
  }
  if (!response.ok) throw new Error(`Could not fetch Diablo weights (HTTP ${response.status}).`);

  const total = Number(response.headers.get('content-length') || 0);
  if (total > 0) {
    console.log(`[Diablo Model] 📊 Total Diablo weights size: ${(total / (1024 * 1024)).toFixed(2)} MB`);
  }

  let downloadedBlob: Blob;
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    let lastReported = -1;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total > 0) {
        const pct = Math.max(0, Math.min(100, Math.round((received / total) * 100)));
        if (pct !== lastReported) {
          if (pct % 10 === 0 || pct === 100) {
            console.log(`[Diablo Model] ⏳ Downloading Diablo weights: ${pct}% (${(received / (1024 * 1024)).toFixed(2)} MB / ${(total / (1024 * 1024)).toFixed(2)} MB)`);
          }
          lastReported = pct;
          post({ type: 'PROGRESS', stage: 'model-download', progress: pct, isWeights: true, model: 'diablo', file: 'Diablo.onnx' });
        }
      } else {
        post({ type: 'STATUS', stage: 'downloading-diablo', loaded: received, model: 'diablo' });
      }
    }
    downloadedBlob = new Blob(chunks as any, { type: 'application/octet-stream' });
  } else {
    downloadedBlob = await response.blob();
  }

  if (!downloadedBlob || downloadedBlob.size === 0) {
    throw new Error('Diablo weights are empty or could not be read.');
  }

  console.log(`[Diablo Model] ✅ Diablo weights download completed: ${(downloadedBlob.size / (1024 * 1024)).toFixed(2)} MB`);

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(DIABLO_MODEL_CACHE);
      await cache.put(cacheUrl, new Response(downloadedBlob.slice(0), {
        status: 200,
        headers: { 'content-type': 'application/octet-stream', 'content-length': String(downloadedBlob.size) },
      }));
      if (cacheUrl !== DEFAULT_DIABLO_MODEL_URL) {
        await cache.put(DEFAULT_DIABLO_MODEL_URL, new Response(downloadedBlob.slice(0), {
          status: 200,
          headers: { 'content-type': 'application/octet-stream', 'content-length': String(downloadedBlob.size) },
        }));
      }
      console.log(`[Diablo Model] 💾 Successfully saved Diablo weights into Cache API ("${DIABLO_MODEL_CACHE}")`);
    } catch { /* storage full or blocked — cache is best-effort */ }
  }

  const ab = await downloadedBlob.arrayBuffer();
  return {
    source: new Uint8Array(ab),
  };
}

async function createOrtSessionSafe(ort: any, source: string | Uint8Array, options: any): Promise<any> {
  if (typeof source === 'string') {
    try {
      return await ort.InferenceSession.create(source, options);
    } catch (err: any) {
      if (source.startsWith('blob:')) {
        console.warn('[Diablo Model] Blob URL session creation failed, reading array buffer fallback:', err?.message);
        const res = await fetch(source);
        const ab = await res.arrayBuffer();
        return await ort.InferenceSession.create(new Uint8Array(ab), options);
      }
      throw err;
    }
  }
  return await ort.InferenceSession.create(source, options);
}

let diabloSessionPromise: Promise<{ session: any; engine: Engine }> | null = null;

/** Create the Diablo ORT session; prefers WebGPU, falls back to WASM. */
async function ensureDiabloSession(forceWasm = false): Promise<{ session: any; engine: Engine }> {
  if (forceWasm && diabloSessionPromise) {
    const currentPromise = diabloSessionPromise;
    diabloSessionPromise = null;
    try {
      const { session, engine } = await currentPromise;
      if (engine === 'webgpu') {
        await session?.release?.();
      } else {
        diabloSessionPromise = currentPromise;
      }
    } catch { /* best effort */ }
  }

  if (!diabloSessionPromise) {
    diabloSessionPromise = (async () => {
      const ort = await loadOrtRuntime();

      // Mobile devices are pinned to WASM to avoid uncatchable GPU OOM crashes.
      const isMobile = isMobileDevice();
      const hasWebGpu = (isMobile || forceWasm) ? false : await detectWebGPU();
      const ep: Engine = hasWebGpu ? 'webgpu' : 'wasm';
      webgpuAvailable = hasWebGpu;

      console.log(`[Diablo Model] 🧠 Initializing ONNX session (preferred engine: ${ep}, WebGPU available: ${hasWebGpu})...`);
      const modelSource = await getDiabloModelSource();

      try {
        if (ep === 'webgpu') {
          postStatus('initializing-webgpu', { model: 'diablo' });
          try {
            console.log(`[Diablo Model] ⚡ Creating WebGPU ONNX InferenceSession (graphOptimizationLevel: 'all')...`);
            const sessionOptions: any = {
              executionProviders: ['webgpu', 'wasm'],
              graphOptimizationLevel: 'all',
            };
            const session = await createOrtSessionSafe(ort, modelSource.source, sessionOptions);
            console.log(`[Diablo Model] ✅ WebGPU ONNX session created successfully!`);
            return { session, engine: 'webgpu' as Engine };
          } catch (error) {
            lastWebgpuError = errorMessage(error);
            console.warn('[Diablo Model] ⚠️ WebGPU session create failed, falling back to WASM:', lastWebgpuError);
            post({
              type: 'ENGINE_FALLBACK',
              from: 'webgpu',
              to: 'wasm',
              stage: 'diablo-initialization',
              reason: lastWebgpuError,
            });
          }
        }
        postStatus('initializing-wasm', { model: 'diablo' });
        console.log(`[Diablo Model] ☕ Creating WASM ONNX InferenceSession (graphOptimizationLevel: 'all')...`);
        const wasmOptions: any = {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        };
        let wasmSource = modelSource.source;
        if (wasmSource instanceof Uint8Array && wasmSource.byteLength === 0) {
          console.log('[Diablo Model] Re-fetching fresh weights for WASM fallback...');
          const fresh = await getDiabloModelSource();
          wasmSource = fresh.source;
        }
        const session = await createOrtSessionSafe(ort, wasmSource, wasmOptions);
        console.log(`[Diablo Model] ✅ WASM ONNX session created successfully!`);
        return { session, engine: 'wasm' as Engine };
      } finally {
        modelSource.cleanup?.();
      }
    })().catch((error) => {
      diabloSessionPromise = null;
      throw error;
    });
  }
  return diabloSessionPromise;
}

/** Release Diablo GPU/WASM resources and ONNX session from RAM. */
async function disposeDiabloSession(): Promise<void> {
  if (!diabloSessionPromise) return;
  console.log('[Pixelify BG Worker] 🧹 Unloading Diablo model from RAM...');
  const promise = diabloSessionPromise;
  diabloSessionPromise = null;
  try {
    const { session } = await promise;
    await session?.release?.();
    console.log('[Pixelify BG Worker] 🗑️ Diablo ONNX session released and freed from RAM.');
  } catch (err) {
    console.warn('[Pixelify BG Worker] Diablo release encountered error:', err);
  }
}

/** Normalize RGBA pixels into the NCHW ImageNet-normalized Diablo input. */
function buildDiabloInput(rgba: Uint8ClampedArray): Float32Array {
  const size = DIABLO_INPUT_SIZE * DIABLO_INPUT_SIZE;
  const input = new Float32Array(3 * size);
  for (let px = 0; px < size; px++) {
    const r = rgba[px * 4] / 255;
    const g = rgba[px * 4 + 1] / 255;
    const b = rgba[px * 4 + 2] / 255;
    input[px] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    input[size + px] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    input[2 * size + px] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return input;
}

/** Sigmoid mask → RGBA cutout PNG (mask upsampled back at original resolution). */
async function composeDiabloCutout(bitmap: ImageBitmap, mask: Float32Array): Promise<Blob> {
  const width = bitmap.width;
  const height = bitmap.height;

  if (width === 0 || height === 0) throw new Error('The selected image is empty or could not be read.');

  // 1. Mask plane: paint sigmoid values as alpha into 1024x1024 mask canvas
  const maskCanvas = new OffscreenCanvas(DIABLO_INPUT_SIZE, DIABLO_INPUT_SIZE);
  const maskCtx = maskCanvas.getContext('2d')!;
  const maskData = maskCtx.createImageData(DIABLO_INPUT_SIZE, DIABLO_INPUT_SIZE);
  for (let px = 0; px < mask.length; px++) {
    const a = Math.max(0, Math.min(255, Math.round(mask[px] * 255)));
    maskData.data[px * 4] = 255;
    maskData.data[px * 4 + 1] = 255;
    maskData.data[px * 4 + 2] = 255;
    maskData.data[px * 4 + 3] = a;
  }
  maskCtx.putImageData(maskData, 0, 0);

  // 2. Hardware-accelerated composite using destination-in:
  // Draw original image, then apply smooth alpha mask in one native pass.
  // Zero 80MB JS ImageData buffers, zero 20-million-pixel JS loops!
  const outCanvas = new OffscreenCanvas(width, height);
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';

  // Draw original image (RGB)
  outCtx.drawImage(bitmap, 0, 0, width, height);

  // Mask transparent cutout directly via destination-in
  outCtx.globalCompositeOperation = 'destination-in';
  outCtx.drawImage(maskCanvas, 0, 0, width, height);

  bitmap.close?.();

  const blob = await outCanvas.convertToBlob({ type: 'image/png' });

  // Free OffscreenCanvas allocations immediately
  maskCanvas.width = 0;
  maskCanvas.height = 0;
  outCanvas.width = 0;
  outCanvas.height = 0;

  if (!blob || blob.size === 0) throw new Error('Background removal produced an empty image.');
  console.log(`[Diablo Model] ✂️ Cutout PNG blob generated: ${(blob.size / 1024).toFixed(1)} KB (${width}x${height}px)`);
  return blob;
}

/** Preprocess at native decode → Diablo session → mask composition. */
async function runDiabloSession(session: any, inputBlob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(inputBlob);
  if (!bitmap.width || !bitmap.height) {
    bitmap.close?.();
    throw new Error('The selected image is empty or could not be read.');
  }

  console.log(`[Diablo Model] 🖼️ Input image decoded: ${bitmap.width}x${bitmap.height}px. Preprocessing to ${DIABLO_INPUT_SIZE}x${DIABLO_INPUT_SIZE} tensor...`);

  const preCanvas = new OffscreenCanvas(DIABLO_INPUT_SIZE, DIABLO_INPUT_SIZE);
  const preCtx = preCanvas.getContext('2d', { willReadFrequently: true })!;
  preCtx.imageSmoothingEnabled = true;
  preCtx.imageSmoothingQuality = 'high';
  preCtx.drawImage(bitmap, 0, 0, DIABLO_INPUT_SIZE, DIABLO_INPUT_SIZE);
  const rgba = preCtx.getImageData(0, 0, DIABLO_INPUT_SIZE, DIABLO_INPUT_SIZE).data;
  // Free preprocessing canvas backing buffer immediately after extracting pixel data
  preCanvas.width = 0;
  preCanvas.height = 0;

  const ort = await loadOrtRuntime();
  const inputTensor = new ort.Tensor('float32', buildDiabloInput(rgba), [1, 3, DIABLO_INPUT_SIZE, DIABLO_INPUT_SIZE]);
  const inName = session.inputNames?.[0] || 'input.1';
  const feeds: Record<string, any> = { [inName]: inputTensor };
  console.log(`[Diablo Model] ⚡ Running Diablo ONNX neural inference...`);
  const inferStart = performance.now();
  const output = await session.run(feeds);
  const inferMs = Math.round(performance.now() - inferStart);
  const outName = session.outputNames?.[0] ?? Object.keys(output)[0];
  const rawMask = output[outName]?.data as Float32Array;
  if (!rawMask || rawMask.length !== DIABLO_INPUT_SIZE * DIABLO_INPUT_SIZE) {
    throw new Error('Diablo produced an unexpected mask output shape.');
  }
  const maskData = new Float32Array(rawMask);

  // Release intermediate GPU/WASM tensor buffers from RAM
  try { inputTensor?.dispose?.(); } catch {}
  try { output[outName]?.dispose?.(); } catch {}

  console.log(`[Diablo Model] 🎭 Segmentation mask generated in ${inferMs}ms (${maskData.length} floats). Compositing transparent PNG at original resolution (${bitmap.width}x${bitmap.height}px)...`);

  return composeDiabloCutout(bitmap, maskData);
}

/** Full Diablo inference pass: preprocess → ORT session → mask → PNG.
 *  A WebGPU device fault during inference is retried once on WASM (same
 *  resilience contract as the chopper pipeline). */
async function runDiabloSessionSafe(info: { session: any; engine: Engine }, inputBlob: Blob): Promise<{ blob: Blob; engine: Engine }> {
  try {
    const blob = await runDiabloSession(info.session, inputBlob);
    return { blob, engine: info.engine };
  } catch (error) {
    if (info.engine !== 'webgpu') throw error;

    const message = errorMessage(error);
    lastWebgpuError = message;
    console.warn(`[Diablo Model] ⚠️ WebGPU inference error: ${message}. Retrying on WASM...`);
    post({
      type: 'ENGINE_FALLBACK',
      from: 'webgpu',
      to: 'wasm',
      stage: 'diablo-inference',
      reason: message,
    });
    // WebGPU device faults poison the device for ORT; rebuild on WASM once.
    await disposeDiabloSession();
    const wasm = await ensureDiabloSession(true);
    const blob = await runDiabloSession(wasm.session, inputBlob);
    return { blob, engine: 'wasm' };
  }
}

/** Diablo REMOVE_BG pass with job staging that mirrors the chopper path. */
async function handleDiabloRemoval(data: WorkerMessage, id?: string | number): Promise<void> {
  const startedAt = performance.now();
  console.log(`[Diablo Model] 🚀 Starting Diablo removal pipeline for job "${id}"`);
  // Ensure Chopper model pipeline is freed from RAM while Diablo runs
  await disposeChopper();
  try {
    if (data.diabloModelUrl && data.diabloModelUrl !== diabloModelUrlOverride) {
      diabloModelUrlOverride = data.diabloModelUrl;
    }
    post({ type: 'JOB_STAGE', id, stage: 'reading-image', message: 'Analyzing image data...' });
    postStatus('reading-image', { id, model: 'diablo' });
    const inputBlob = await loadInputBlob(data.url || '');

    post({
      type: 'JOB_STAGE',
      id,
      stage: 'loading-diablo',
      message: 'Summoning Diablo inference weights...',
    });
    postStatus('loading-diablo', { id, model: 'diablo' });
    const sessionInfo = await ensureDiabloSession(data.forceWasm === true);

    post({ type: 'JOB_STAGE', id, stage: 'running-inference', message: 'Diablo matting subject pixels...' });
    postStatus('running-inference', { id, engine: sessionInfo.engine, model: 'diablo' });
    const { blob: output, engine: finalEngine } = await runDiabloSessionSafe(sessionInfo, inputBlob);

    post({ type: 'JOB_STAGE', id, stage: 'encoding-output', message: 'Refining transparent cutout edges...' });
    postStatus('encoding-output', { id, model: 'diablo' });

    console.log(`[Diablo Model] 🏁 Diablo job "${id}" finished successfully in ${Math.round(performance.now() - startedAt)}ms using ${finalEngine}. Outputting result to main thread.`);

    post({
      type: 'DONE',
      id,
      blob: output,
      engine: finalEngine,
      model: 'diablo' as BgModelKey,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
    postStatus('idle');
  } catch (error) {
    const message = errorMessage(error);
    // Diablo already retried WASM internally before surfacing; anything that
    // still passes through is genuinely failed and must not loop retries.
    post({
      type: 'ERROR',
      id: id ?? null,
      stage: 'remove-bg',
      message,
      model: 'diablo' as BgModelKey,
      engineFailed: false,
    });
  }
}

async function handleMessage(data: WorkerMessage): Promise<void> {
  const { type, id, url, forceWasm, runtimeUrl, modelUrl, diabloModelUrl } = data || {};
  const requestedModel: BgModelKey = data?.model === 'diablo' ? 'diablo' : 'chopper';

  if (type === 'INIT') {
    if (modelUrl && modelUrl !== modelUrlOverride) {
      modelUrlOverride = modelUrl;
    }
    if (diabloModelUrl && diabloModelUrl !== diabloModelUrlOverride) {
      diabloModelUrlOverride = diabloModelUrl;
    }
    if (runtimeUrl && runtimeUrl !== runtimeUrlOverride) {
      // The pipeline may already exist from an earlier INIT created before the
      // blob URL arrived; the override only affects future pipeline creations.
      runtimeUrlOverride = runtimeUrl;
    }
    initStartedAt = performance.now();
    postStatus('checking-webgpu');
    try {
      if (requestedModel === 'diablo') {
        const info = await ensureDiabloSession(forceWasm === true);
        const isMobile = isMobileDevice();
        post({
          type: 'READY',
          engine: info.engine || 'wasm',
          webgpuAvailable,
          model: 'diablo',
          elapsedMs: Math.round(performance.now() - initStartedAt),
          reason: isMobile && webgpuAvailable
            ? 'Mobile device detected: using Standard (CPU) mode to prevent browser memory crashes.'
            : undefined,
        });
      } else {
        const remover = await getRemover(forceWasm === true);
        const isMobile = isMobileDevice();
        // getRemover resolves only when a usable pipeline has actually initialized.
        post({
          type: 'READY',
          engine: chosenEngine || 'wasm',
          webgpuAvailable,
          model: modelUrlOverride ? 'chopper.onnx' : MODEL_ID,
          elapsedMs: Math.round(performance.now() - initStartedAt),
          reason: isMobile && webgpuAvailable
            ? 'Mobile device detected: using Standard (CPU) mode to prevent browser memory crashes.'
            : undefined,
        });
        void remover;
      }
    } catch (error) {
      post({
        type: 'ERROR',
        id: id ?? null,
        stage: 'initialization',
        message: errorMessage(error),
        engineFailed: preferredEngine === 'webgpu' || !!lastWebgpuError,
        webgpuAvailable,
      });
    }
    return;
  }

  if (type === 'UNLOAD_MODEL') {
    const target = data.model;
    if (target === 'chopper') {
      await disposeChopper();
    } else if (target === 'diablo') {
      await disposeDiabloSession();
    } else {
      await disposeChopper();
      await disposeDiabloSession();
    }
    postStatus('idle');
    return;
  }

  if (type === 'REMOVE_BG') {
    if (requestedModel === 'diablo') {
      console.log(`[Diablo Model] 🎯 Worker received REMOVE_BG: Taking Diablo model for job "${id}"`);
      await handleDiabloRemoval(data, id);
      return;
    }

    // Ensure Diablo session is freed from RAM while Chopper runs
    await disposeDiabloSession();

    const startedAt = performance.now();
    try {
      post({ type: 'JOB_STAGE', id, stage: 'reading-image', message: 'Analyzing image data...' });
      postStatus('reading-image', { id });
      const inputBlob = await loadInputBlob(url || '');
      post({ type: 'JOB_STAGE', id, stage: 'running-inference', message: 'Neural network segmenting subject...' });
      postStatus('running-inference', { id, engine: chosenEngine });
      const output = await runInference(inputBlob);
      post({ type: 'JOB_STAGE', id, stage: 'encoding-output', message: 'Refining transparent cutout edges...' });
      postStatus('encoding-output', { id });
      if (!output || typeof output.toBlob !== 'function') {
        throw new Error('The background-removal model returned an unsupported output.');
      }
      const blob: Blob = await output.toBlob('image/png');
      try { (output as any).dispose?.(); } catch {}
      if (!blob || blob.size === 0) throw new Error('Background removal produced an empty image.');
      post({
        type: 'DONE',
        id,
        blob,
        engine: chosenEngine,
        model: 'chopper' as BgModelKey,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      postStatus('idle');
    } catch (error) {
      const message = errorMessage(error);
      // Classify engine faults the old worker's way: ANY suspicious WebGPU fault
      // (device lost, OrtRun buffer mapping failure, async buffer invalidation
      // surfacing even during toBlob) must escalate to a main-thread restart —
      // terminate this worker, recreate with forceWasm, and replay pending jobs.
      // Note webgpuTouched covers "the webgpu pipeline already produced this
      // output object" cases like a failed output.toBlob() after inference.
      const engineFault =
        (error as any)?.engineFailed === true ||
        (looksLikeWebgpuFault(message) && (chosenEngine === 'webgpu' || webgpuTouched));
      if (engineFault) {
        lastWebgpuError = message;
        post({
          type: 'ENGINE_FALLBACK',
          from: chosenEngine || 'webgpu',
          to: 'wasm',
          stage: 'remove-bg',
          reason: message,
        });
      }
      post({
        type: 'ERROR',
        id: id ?? null,
        stage: 'remove-bg',
        message,
        model: 'chopper' as BgModelKey,
        engine: chosenEngine,
        engineFailed: engineFault,
      });
    }
  }
}

// Serialize commands in this worker. This prevents simultaneous model loads,
// duplicate inference on one pipeline, and a WASM fallback racing another job.
let messageQueue: Promise<void> = Promise.resolve();
worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  messageQueue = messageQueue
    .then(() => handleMessage(event.data || {}))
    .catch((error) => {
      // Keep the queue alive even if an unexpected error escapes a handler.
      post({ type: 'ERROR', id: event.data?.id ?? null, stage: 'worker', message: errorMessage(error) });
    });
});