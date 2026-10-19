/// <reference lib="webworker" />

// Transformers.js is loaded at runtime from the CDN (same distribution method
// the app already uses for ONNX Runtime Web). This keeps the bundler from
// pulling the whole onnxruntime-web ESM/wasm asset graph into the worker chunk.
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js';

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

async function loadTransformers(): Promise<void> {
  if (env && pipeline) return;
  if (!transformersLoading) {
    transformersLoading = (async () => {
      const mod = await nativeImport(TRANSFORMERS_CDN);
      pipeline = mod.pipeline;
      env = mod.env;

      // Model weights are fetched from the model repository; no local-model lookup.
      env.allowLocalModels = false;

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
type WorkerMessage = {
  type?: string;
  id?: string | number;
  url?: string;
  forceWasm?: boolean;
};

const MODEL_ID = 'studioludens/birefnet-lite-512';
const GPU_PROBE_TIMEOUT_MS = 3500;

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
    });
  } else if (event?.status) {
    post({ type: 'STATUS', stage: String(event.status), detail: event.file });
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
  await loadTransformers();
  postStatus('loading-model', { requestedEngine: engine, model: MODEL_ID });
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
      return;
    }
  } catch { /* continue with model-level cleanup */ }
  try {
    if (typeof remover.model?.dispose === 'function') await remover.model.dispose();
  } catch { /* some backends own their resource lifecycle */ }
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

async function handleMessage(data: WorkerMessage): Promise<void> {
  const { type, id, url, forceWasm } = data || {};

  if (type === 'INIT') {
    initStartedAt = performance.now();
    postStatus('checking-webgpu');
    try {
      const remover = await getRemover(forceWasm === true);
      const isMobile = isMobileDevice();
      // getRemover resolves only when a usable pipeline has actually initialized.
      post({
        type: 'READY',
        engine: chosenEngine || 'wasm',
        webgpuAvailable,
        model: MODEL_ID,
        elapsedMs: Math.round(performance.now() - initStartedAt),
        reason: isMobile && webgpuAvailable
          ? 'Mobile device detected: using Standard (CPU) mode to prevent browser memory crashes.'
          : undefined,
      });
      void remover;
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

  if (type === 'REMOVE_BG') {
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
      if (!blob || blob.size === 0) throw new Error('Background removal produced an empty image.');
      post({
        type: 'DONE',
        id,
        blob,
        engine: chosenEngine,
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