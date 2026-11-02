import type { LiteRtRuntime, UpscalerAccelerator } from './runtime';
import { MODELS } from '../../lib/constants';
import type { ModelKey } from '../../types';

export type ModelLoadProgress = (pct: number) => void;
const MODEL_ASSET_REVISION = 'fixed-tile-webgpu-v3';
export interface LiteRtSession {
  model: any;
  worker?: Worker;
  pending?: Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>;
  inputDetails: any[];
  outputDetails: any[];
  __engine: UpscalerAccelerator;
  __fallback: boolean;
  __fallbackReason?: string;
  __modelKey: ModelKey;
  fallbackToMainThread?: (reason: unknown) => Promise<void>;
  release: () => void;
}

async function canUseWebGPU(runtime: LiteRtRuntime): Promise<boolean> {
  const gpu = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { gpu?: any }).gpu;
  if (!await runtime.isWebGPUSupported() || !gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter || adapter.isFallbackAdapter) return false;
    const info = adapter.info;
    const description = [info?.vendor, info?.architecture, info?.device, info?.description].join(' ').toLowerCase();
    return !/swiftshader|software|llvmpipe|lavapipe/.test(description);
  } catch {
    return false;
  }
}

function modelUrl(path: string): string {
  if (typeof location === 'undefined') return path;
  const url = new URL(path, location.origin);
  url.searchParams.set('litert', MODEL_ASSET_REVISION);
  return url.href;
}

function getCandidateUrls(path: string): string[] {
  const primary = modelUrl(path);
  const urls = [primary];
  if (typeof location !== 'undefined') {
    try {
      const parsed = new URL(primary);
      const filename = parsed.pathname.split('/').pop();
      if (filename && filename.endsWith('.tflite')) {
        const local = new URL(`/models/${filename}`, location.origin);
        local.searchParams.set('litert', MODEL_ASSET_REVISION);
        if (local.href !== primary) {
          urls.push(local.href);
        }
      }
    } catch {
      // ignore parsing errors
    }
  }
  return urls;
}

async function modelBytes(path: string, onProgress?: ModelLoadProgress, signal?: AbortSignal): Promise<Uint8Array> {
  const urls = getCandidateUrls(path);
  const cache = typeof caches !== 'undefined' ? await caches.open('litert-upscaler-models-v2').catch(() => null) : null;
  for (const url of urls) {
    const cached = await cache?.match(url);
    if (cached) {
      const bytes = new Uint8Array(await cached.arrayBuffer());
      if (bytes.byteLength > 100_000) {
        const source = url.includes('huggingface.co') ? 'Hugging Face' : 'local public/models';
        console.log(`[Pixelify Upscaler] Loaded model from ${source} (Browser Cache): ${url}`);
        onProgress?.(100);
        return bytes;
      }
      await cache?.delete(url);
    }
  }
  let lastError: Error | null = null;
  for (const url of urls) {
    const isHf = url.includes('huggingface.co');
    const source = isHf ? 'Hugging Face' : 'local public/models';
    console.log(`[Pixelify Upscaler] Downloading model from ${source}: ${url}`);
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const total = Number(response.headers.get('content-length')) || 0;
      if (!response.body || !total) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        onProgress?.(100);
        if (bytes.byteLength > 100_000) await cache?.put(url, new Response(bytes.slice().buffer));
        console.log(`[Pixelify Upscaler] Successfully downloaded and cached model from ${source} (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB)`);
        return bytes;
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) { chunks.push(value); received += value.length; onProgress?.(Math.min(95, received / total * 95)); }
      }
      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      if (bytes.byteLength > 100_000) await cache?.put(url, new Response(bytes.slice().buffer));
      console.log(`[Pixelify Upscaler] Successfully downloaded and cached model from ${source} (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB)`);
      onProgress?.(100);
      return bytes;
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (urls.length > 1) {
        console.warn(`[Pixelify Upscaler] Failed to fetch model from ${source} (${url}), trying fallback:`, err);
      }
    }
  }
  throw new Error(`Failed to load model file ${path}: ${lastError?.message || 'Network error'}`);
}

export async function isUpscalerModelCached(key: ModelKey): Promise<boolean> {
  try {
    const cache = await caches.open('litert-upscaler-models-v2');
    const urls = getCandidateUrls(MODELS[key].file);
    for (const url of urls) {
      if (await cache.match(url)) return true;
    }
    return false;
  }
  catch { return false; }
}

const describeError = (error: unknown) => error instanceof Error ? error.message : String(error);

function hasDynamicShape(inputDetails: any[], outputDetails: any[]): boolean {
  return [...inputDetails, ...outputDetails].some((detail: any) => Array.from(detail.shape as ArrayLike<number>).some((dim) => dim < 1));
}

interface WorkerPlumbing {
  worker: Worker;
  request: (message: Record<string, unknown>, transfer?: Transferable[]) => Promise<any>;
  pending: Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>;
}

function spawnInferenceWorker(): WorkerPlumbing | null {
  if (typeof Worker === 'undefined') return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL('./inference.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  let requestId = 0;
  worker.onmessage = (event: MessageEvent<any>) => {
    const response = event.data;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.type === 'error') request.reject(new Error(response.error));
    else request.resolve(response);
  };
  worker.onerror = (event) => {
    for (const request of pending.values()) request.reject(new Error(event.message || 'LiteRT inference worker failed.'));
    pending.clear();
  };
  const request = (message: Record<string, unknown>, transfer: Transferable[] = []) => new Promise<any>((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    worker?.postMessage({ ...message, id }, transfer);
  });
  return { worker, request, pending };
}

/** Compiles a session that lives entirely on the page thread (no worker). */
async function compileMainThreadSession(
  runtime: LiteRtRuntime, bytes: Uint8Array, key: ModelKey, accelerator: UpscalerAccelerator,
): Promise<LiteRtSession> {
  const model: any = await runtime.loadAndCompile(bytes, { accelerator });
  try {
    const inputDetails = model.getInputDetails();
    const outputDetails = model.getOutputDetails();
    if (hasDynamicShape(inputDetails, outputDetails)) {
      throw new Error(`LiteRT.js requires fixed input and output dimensions. ${key} contains a dynamic tensor shape (compile for fixed tile dimensions).`);
    }
    return {
      model,
      inputDetails,
      outputDetails,
      __engine: accelerator,
      __fallback: false,
      __modelKey: key,
      release: () => model.delete?.(),
    };
  } catch (error) {
    model.delete?.();
    throw error;
  }
}

/** Compiles a session that keeps compilation AND execution inside the worker; the page thread only shuttles tile buffers. */
async function createWorkerSession(
  runtime: LiteRtRuntime, bytes: Uint8Array, key: ModelKey, accelerator: UpscalerAccelerator,
): Promise<LiteRtSession> {
  const plumbing = spawnInferenceWorker();
  if (!plumbing) throw new Error('Module workers are unavailable in this browser.');
  const { worker, request, pending } = plumbing;
  let session: LiteRtSession | undefined;
  try {
    const modelBytesCopy = bytes.slice();
    const ready = await request({ type: 'init', bytes: modelBytesCopy.buffer, accelerator }, [modelBytesCopy.buffer]);
    const inputDetails = ready.inputDetails;
    const outputDetails = ready.outputDetails;
    if (hasDynamicShape(inputDetails, outputDetails)) {
      throw new Error(`LiteRT.js requires fixed input and output dimensions. ${key} contains a dynamic tensor shape; export this model with fixed dimensions.`);
    }
    session = {
      model: null,
      worker,
      pending,
      inputDetails,
      outputDetails,
      __engine: accelerator,
      __fallback: false,
      __modelKey: key,
      release: () => { worker?.postMessage({ type: 'release' }); worker?.terminate(); session?.model?.delete?.(); pending.clear(); },
    };
    session.fallbackToMainThread = async (reason) => {
      const mainModel: any = await runtime.loadAndCompile(bytes, { accelerator: 'wasm' });
      const mainInputs = mainModel.getInputDetails();
      const mainOutputs = mainModel.getOutputDetails();
      if (hasDynamicShape(mainInputs, mainOutputs)) {
        mainModel.delete?.();
        throw new Error(`LiteRT ${key} has a dynamic tensor shape and cannot use the main-thread fallback.`);
      }
      worker?.postMessage({ type: 'release' });
      worker?.terminate();
      pending.clear();
      session!.model = mainModel;
      session!.worker = undefined;
      session!.pending = undefined;
      session!.inputDetails = mainInputs;
      session!.outputDetails = mainOutputs;
      session!.__engine = 'wasm';
      session!.__fallback = true;
      session!.__fallbackReason = reason instanceof Error ? reason.message : String(reason);
    };
    Object.defineProperty(session, 'request', { value: request });
    return session;
  } catch (error) {
    worker?.terminate();
    throw error;
  }
}

/**
 * Builds the strongest session available, always preferring to keep work off
 * the page thread:
 *   1. WebGPU inside the inference worker
 *   2. WebGPU on the page thread (only for browsers/drivers that cannot
 *      initialize WebGPU from a module worker)
 *   3. WASM inside the inference worker
 *   4. WASM on the page thread (browsers without module workers)
 */
export async function createSession(
  runtime: LiteRtRuntime, key: ModelKey, preferred?: UpscalerAccelerator,
  onProgress?: ModelLoadProgress, signal?: AbortSignal,
): Promise<LiteRtSession> {
  const bytes = await modelBytes(MODELS[key].file, (pct) => onProgress?.(Math.round(pct * .85)), signal);
  let lastError: unknown;
  let fallbackReason: string | undefined;
  const gpuAllowed = preferred !== 'wasm';

  if (gpuAllowed) {
    try {
      const session = await createWorkerSession(runtime, bytes, key, 'webgpu');
      onProgress?.(100);
      return session;
    } catch (error) {
      lastError = error;
      fallbackReason = `Worker WebGPU unavailable for ${key}: ${describeError(error)}`;
      console.warn(`LiteRT WebGPU init failed inside the inference worker for ${key}; retrying with the page-thread GPU.`, error);
    }

    if (await canUseWebGPU(runtime)) {
      try {
        const session = await compileMainThreadSession(runtime, bytes, key, 'webgpu');
        session.__fallback = true;
        session.__fallbackReason = fallbackReason;
        onProgress?.(100);
        return session;
      } catch (error) {
        lastError = error;
        fallbackReason = `WebGPU compile failed for ${key}: ${describeError(error)}`;
        console.warn(`LiteRT WebGPU compile failed for ${key}; retrying with WASM.`, error);
      }
    }
  }

  try {
    const session = await createWorkerSession(runtime, bytes, key, 'wasm');
    session.__fallback = !!fallbackReason;
    session.__fallbackReason = fallbackReason;
    onProgress?.(100);
    return session;
  } catch (error) {
    lastError = error;
    console.warn(`LiteRT WASM worker setup failed for ${key}; retrying on the page thread.`, error);
  }

  try {
    const session = await compileMainThreadSession(runtime, bytes, key, 'wasm');
    session.__fallback = true;
    session.__fallbackReason = `Worker inference unavailable: ${lastError instanceof Error ? lastError.message : String(lastError)}`;
    onProgress?.(100);
    return session;
  } catch (fallbackError) {
    throw fallbackError instanceof Error ? fallbackError : (lastError instanceof Error ? lastError : new Error(`Could not compile LiteRT model: ${key}`));
  }
}

/** Adapts CHW/HWC app planes to the model's declared tensor layout and returns an owned CPU copy. */
export async function runTile(
  runtime: LiteRtRuntime, session: LiteRtSession, chw: Float32Array, width: number, height: number, channels: number,
): Promise<Float32Array> {
  const input = session.inputDetails[0];
  const shape = Array.from(input.shape as ArrayLike<number>);
  const nhwc = shape.length === 4 && (shape[3] === channels || (shape[3] < 0 && shape[1] !== channels));
  // LiteRT preserves dynamic dimensions as -1 in model metadata. Supply the concrete
  // one-image tile dimensions when constructing the runtime tensor.
  for (let i = 0; i < shape.length; i++) if (shape[i] < 0) {
    if (i === 0) shape[i] = 1;
    else if (shape.length === 4 && nhwc) shape[i] = i === 1 ? height : i === 2 ? width : channels;
    else if (shape.length === 4) shape[i] = i === 1 ? channels : i === 2 ? height : width;
    else shape[i] = 1;
  }
  const tensorData = nhwc ? new Float32Array(chw.length) : chw;
  if (nhwc) {
    const plane = width * height;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
      for (let c = 0; c < channels; c++) tensorData[(y * width + x) * channels + c] = chw[c * plane + y * width + x];
  }
  if (session.worker) {
    const copy = tensorData.slice();
    const request = (session as any).request as (message: Record<string, unknown>, transfer?: Transferable[]) => Promise<any>;
    try {
      const response = await request({
        type: 'run', data: copy.buffer, shape, inputName: input.name, outputName: session.outputDetails[0].name,
      }, [copy.buffer]);
      return new Float32Array(response.data);
    } catch (error) {
      if (!session.fallbackToMainThread) throw error;
      console.warn(`LiteRT worker inference failed for ${session.__modelKey}; retrying this model on LiteRT WASM in the page thread.`, error);
      await session.fallbackToMainThread(error);
      return runTile(runtime, session, chw, width, height, channels);
    }
  }

  const inputTensor = new runtime.Tensor(tensorData, shape, 'float32');
  let outputs: any;
  try {
    outputs = await session.model.run({ [input.name]: inputTensor });
    const outputTensor = Array.isArray(outputs) ? outputs[0] : outputs[session.outputDetails[0].name];
    const cpuTensor = await outputTensor.moveTo('wasm');
    const result = new Float32Array(cpuTensor.toTypedArray() as Float32Array);
    if (cpuTensor !== outputTensor) cpuTensor.delete();
    return result;
  } finally {
    inputTensor.delete();
    outputs?.delete?.();
    if (outputs && !Array.isArray(outputs)) Object.values(outputs).forEach((tensor: any) => tensor?.delete?.());
    else if (Array.isArray(outputs)) outputs.forEach((tensor: any) => tensor?.delete?.());
  }
}
