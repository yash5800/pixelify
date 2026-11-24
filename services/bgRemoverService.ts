/**
 * bgRemoverService.ts
 *
 * Singleton background removal service.
 * Manages the lifetime of the background removal Web Worker so that:
 * 1. The worker starts and pre-warms on initial site visit (not just when navigating to /bg_remove).
 * 2. GPU/CPU detection happens upfront and reports live engine status to the Navbar/UI immediately.
 * 3. The background-removal model is cached and ready before the user uploads an image.
 * 4. All components (App, Navbar, BGRemoveWorkspace) share the single worker instance.
 */
import { BgModelKey } from '../types';
import { CHOPPER_MODEL_URL, DIABLO_MODEL_URL } from '../lib/constants';

export type BGEngine = 'wasm' | 'webgpu';

export interface BGRemoverState {
  engine: BGEngine | null;
  webgpuAvailable: boolean;
  isReady: boolean;
  isLoading: boolean;
  progress: number;
  phase: 'idle' | 'detecting' | 'downloading' | 'preparing' | 'ready' | 'error';
  error: string | null;
  fallbackReason: string | null;
  model: BgModelKey;
  /** Which model actually has a live session in the worker (null = none). */
  readyModel: BgModelKey | null;
}

export type EngineSubscriber = (engine: BGEngine, webgpuAvailable: boolean) => void;
export type ProgressSubscriber = (pct: number, isWeights?: boolean, file?: string) => void;
export type StageSubscriber = (stage: string, message?: string) => void;

const WEBGPU_FAILURE_STORAGE_KEY = 'pixelify:bgremover-webgpu-failure:v1';
const WEBGPU_FAILURE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface WebGpuFailureRecord {
  model: BgModelKey;
  device: string;
  expiresAt: number;
  reason: string;
}

function currentDeviceSignature(model: BgModelKey): string {
  if (typeof navigator === 'undefined') return '';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const modelUrl = model === 'diablo' ? DIABLO_MODEL_URL || '' : CHOPPER_MODEL_URL || '';
  const raw = [model, modelUrl, nav.userAgent, nav.platform, nav.deviceMemory || '', nav.hardwareConcurrency || ''].join('|');
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readWebGpuFailure(model: BgModelKey): WebGpuFailureRecord | null {
  try {
    const raw = localStorage.getItem(`${WEBGPU_FAILURE_STORAGE_KEY}:${model}`);
    if (!raw) return null;
    const record = JSON.parse(raw) as WebGpuFailureRecord;
    if (record.model !== model || record.device !== currentDeviceSignature(model)) return null;
    if (!Number.isFinite(record.expiresAt) || record.expiresAt <= Date.now()) {
      localStorage.removeItem(`${WEBGPU_FAILURE_STORAGE_KEY}:${model}`);
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

function writeWebGpuFailure(model: BgModelKey, reason: string): void {
  try {
    const record: WebGpuFailureRecord = {
      model,
      device: currentDeviceSignature(model),
      expiresAt: Date.now() + WEBGPU_FAILURE_TTL_MS,
      reason: reason.slice(0, 300),
    };
    localStorage.setItem(`${WEBGPU_FAILURE_STORAGE_KEY}:${model}`, JSON.stringify(record));
  } catch {
    // Storage can be disabled or full; the current worker still falls back.
  }
}

interface JobResolver {
  url: string;
  model: BgModelKey;
  resolve: (res: { blob: Blob; elapsedMs: number }) => void;
  reject: (err: Error) => void;
  onProgress?: ProgressSubscriber;
  onStage?: StageSubscriber;
}

class BGRemoverService {
  private worker: Worker | null = null;
  private engineSubscribers = new Set<EngineSubscriber>();
  private stateSubscribers = new Set<(state: Readonly<BGRemoverState>) => void>();
  private jobResolvers = new Map<string, JobResolver>();
  private state: BGRemoverState = {
    engine: null,
    webgpuAvailable: false,
    isReady: false,
    isLoading: false,
    progress: 0,
    phase: 'idle',
    error: null,
    fallbackReason: null,
    model: 'chopper',
    readyModel: null,
  };
  private initPromise: Promise<void> | null = null;
  private resolveInit: (() => void) | null = null;
  /** Mirrors state.readyModel for cheap synchronous checks. */
  private readyModel: BgModelKey | null = null;
  private forceWasm = false;
  private replayJobsOnReady = false;
  private capabilityWatchdog: number | null = null;
  private idleRecycleTimer: number | null = null;
  private lifecycleBound = false;
  private hiddenRecycleTimer: number | null = null;

  private shouldForceWasm(model: BgModelKey): boolean {
    return this.forceWasm || !!readWebGpuFailure(model);
  }

  public getWorker(): Worker {
    if (!this.worker) {
      this.bindLifecycleRelease();
      this.worker = new Worker(
        new URL('../workers/bgRemover.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.addEventListener('error', (ev: ErrorEvent) => {
        console.error('[BGRemoverService] Worker error:', ev.message, ev);
        if (this.worker && !this.forceWasm && this.state.engine === 'webgpu') {
          this.restartWithWasm(ev.message || 'WebGPU worker failed. Retrying with WASM.');
          return;
        }
        const err = new Error(ev.message || 'Worker error');
        this.jobResolvers.forEach((r) => r.reject(err));
        this.jobResolvers.clear();
        this.state.isLoading = false;
        this.state.isReady = false;
        this.state.phase = 'error';
        this.state.error = err.message;
        this.notifyStateSubscribers();
        this.clearCapabilityWatchdog();
        this.resolveInit?.();
      });

      this.worker.addEventListener('messageerror', () => {
        const err = new Error('Worker message serialization failed');
        this.jobResolvers.forEach((r) => r.reject(err));
        this.jobResolvers.clear();
        this.state.isLoading = false;
        this.state.isReady = false;
        this.state.phase = 'error';
        this.state.error = err.message;
        this.notifyStateSubscribers();
        this.clearCapabilityWatchdog();
        this.resolveInit?.();
      });

      this.worker.addEventListener('message', (e: MessageEvent) => {
        const msg = e.data;
        if (!msg) return;

        if (msg.type === 'PROGRESS') {
          this.state.progress = msg.progress;
          this.state.phase = 'downloading';

          if (msg.isWeights) {
            // Weights are (re)transferring, so no model is resident right now.
            // Without this, the warm Chopper state kept isReady=true while a
            // Diablo download was in flight and the fake progress ramp ran.
            this.readyModel = null;
            this.state.readyModel = null;
            this.state.isReady = false;
          }

          if (msg.model === 'diablo' || msg.model === 'chopper') this.state.model = msg.model;
          else if (msg.isWeights && this.state.model !== 'diablo') this.state.model = 'chopper';

          this.notifyStateSubscribers();
          this.jobResolvers.forEach((resolver) => {
            resolver.onProgress?.(msg.progress, msg.isWeights, msg.file);
          });
          return;
        }

        if (msg.type === 'STATUS') {
          if (msg.engine && (msg.engine === 'webgpu' || msg.engine === 'wasm')) {
            if (this.state.engine !== msg.engine) {
              this.state.engine = msg.engine;
              this.notifyEngineSubscribers();
              this.notifyStateSubscribers();
            }
          }
          return;
        }

        if (msg.type === 'JOB_STAGE') {
          const entry = this.jobResolvers.get(msg.id);
          if (entry) {
            entry.onStage?.(msg.stage, msg.message);
          }
          return;
        }

        if (msg.type === 'CAPABILITIES') {
          this.clearCapabilityWatchdog();
          this.state.engine = msg.engine === 'webgpu' ? 'webgpu' : 'wasm';
          this.state.webgpuAvailable = !!msg.webgpuAvailable;
          this.state.phase = 'preparing';
          if (msg.reason) {
            this.state.fallbackReason = msg.reason;
          } else if (msg.isMobile && this.state.webgpuAvailable && this.state.engine === 'wasm') {
            this.state.fallbackReason = 'Mobile device: Standard mode used to prevent browser memory crashes.';
          } else if (this.state.webgpuAvailable) {
            this.state.fallbackReason = null;
          } else if (!this.state.fallbackReason) {
            this.state.fallbackReason = 'No usable WebGPU adapter/device was found.';
          }
          this.notifyStateSubscribers();
          if (this.replayJobsOnReady) {
            this.replayJobsOnReady = false;
            this.jobResolvers.forEach((resolver, id) => {
              this.worker?.postMessage({
                type: 'REMOVE_BG',
                id,
                url: resolver.url,
                model: resolver.model,
                forceWasm: this.shouldForceWasm(resolver.model),
                knownWebgpuFailure: readWebGpuFailure(resolver.model)?.reason,
                diabloModelUrl: DIABLO_MODEL_URL,
              });
            });
          }
          return;
        }

        if (msg.type === 'ENGINE_FALLBACK') {
          const model: BgModelKey = msg.model === 'diablo' ? 'diablo' : 'chopper';
          const reason = typeof msg.reason === 'string' ? msg.reason : 'WebGPU initialization or inference failed.';
          writeWebGpuFailure(model, reason);
          if (msg.workerRestartRequired) {
            this.restartWithWasm(reason);
            return;
          }
          this.state.engine = 'wasm';
          this.state.fallbackReason = `${msg.stage || 'WebGPU'}: ${reason}`;
          this.state.phase = 'preparing';
          this.notifyStateSubscribers();
          return;
        }

        if (msg.type === 'READY') {
          this.state.engine = msg.engine === 'webgpu' ? 'webgpu' : 'wasm';
          this.state.webgpuAvailable = !!msg.webgpuAvailable;
          this.state.isReady = true;
          this.state.isLoading = false;
          this.state.progress = 100;
          this.state.phase = 'ready';
          this.state.error = null;

          // INIT always builds either Chopper or Diablo; Chopper reports its
          // Hugging Face id, so normalise instead of trusting the label.
          this.state.model = msg.model === 'diablo' ? 'diablo' : 'chopper';
          this.readyModel = this.state.model;
          this.state.readyModel = this.readyModel;

          if (msg.reason) {
            this.state.fallbackReason = msg.reason;
          } else if (msg.isMobile && this.state.webgpuAvailable && this.state.engine === 'wasm' && !this.state.fallbackReason) {
            this.state.fallbackReason = 'Mobile device: Standard mode used to prevent browser memory crashes.';
          }
          this.notifyEngineSubscribers();
          this.notifyStateSubscribers();
          this.resolveInit?.();
          return;
        }

        if (msg.type === 'DONE') {
          console.log(`[Pixelify BG Service] 📥 Worker DONE for job: ${msg.id}, model: ${msg.model || 'chopper'}, blob size: ${msg.blob?.size} bytes, elapsed: ${msg.elapsedMs}ms`);
          if (msg.model === 'diablo') {
            console.log(`[Diablo Model] 📥 BGRemoverService: Received DONE output from worker for job "${msg.id}" (Cutout PNG size: ${(msg.blob?.size / 1024).toFixed(1)} KB, elapsed: ${msg.elapsedMs}ms)`);
          }
          if (msg.engine && (msg.engine === 'webgpu' || msg.engine === 'wasm')) {
            this.state.engine = msg.engine;
            this.notifyEngineSubscribers();
          }
          this.state.isReady = true;
          this.state.isLoading = false;
          this.state.progress = 100;
          this.state.phase = 'ready';
          if (msg.model === 'diablo' || msg.model === 'chopper') {
            this.state.model = msg.model;
          }
          this.readyModel = this.state.model;
          this.state.readyModel = this.readyModel;
          this.notifyStateSubscribers();
          this.scheduleIdleRecycle(msg.model === 'diablo' ? 'diablo' : 'chopper');

          const entry = this.jobResolvers.get(msg.id);
          if (entry) {
            this.jobResolvers.delete(msg.id);
            entry.resolve({ blob: msg.blob, elapsedMs: msg.elapsedMs });
          } else {
            console.warn(`[Pixelify BG Service] ⚠️ No resolver found for job: ${msg.id}`);
          }
          return;
        }

        if (msg.type === 'ERROR') {
          const errMsg = msg.message || 'Cutout failed';
          console.error(`[Pixelify BG Service] ❌ Worker ERROR for job: ${msg.id}:`, errMsg);
          if (msg.engineFailed && !this.forceWasm) {
            writeWebGpuFailure(msg.model === 'diablo' ? 'diablo' : 'chopper', errMsg);
            this.restartWithWasm(errMsg);
            return;
          }
          if (msg.id == null) {
            this.state.error = errMsg;
            this.state.isLoading = false;
            this.state.isReady = false;
            this.readyModel = null;
            this.state.readyModel = null;
            this.state.phase = 'error';
            this.notifyStateSubscribers();
            this.clearCapabilityWatchdog();
            this.resolveInit?.();
            this.jobResolvers.forEach((r) => r.reject(new Error(errMsg)));
            this.jobResolvers.clear();
          } else {
            const entry = this.jobResolvers.get(msg.id);
            if (entry) {
              this.jobResolvers.delete(msg.id);
              entry.reject(new Error(errMsg));
            }
          }
        }
      });
    }
    return this.worker;
  }

  public init(onEngineReport?: EngineSubscriber): Promise<void> {
    if (onEngineReport) {
      this.subscribeEngine(onEngineReport);
    }

    this.cancelIdleRecycle();
    if (this.state.isReady) return Promise.resolve();
    // A run in flight owns the worker; a late INIT would queue behind the job
    // and rebuild the other model right after it finishes.
    if (this.jobResolvers.size > 0) return Promise.resolve();

    if (!this.initPromise) {
      this.state.isLoading = true;
      this.state.phase = 'detecting';
      this.state.error = null;
      this.notifyStateSubscribers();
      this.initPromise = new Promise<void>((resolve) => {
        this.resolveInit = resolve;
        try {
          const worker = this.getWorker();
          this.startCapabilityWatchdog(worker);
          worker.postMessage({
            type: 'INIT',
            model: this.state.model,
            forceWasm: this.shouldForceWasm(this.state.model),
            knownWebgpuFailure: readWebGpuFailure(this.state.model)?.reason,
            modelUrl: CHOPPER_MODEL_URL,
            diabloModelUrl: DIABLO_MODEL_URL,
          });
        } catch (err) {
          console.warn('[BGRemoverService] init postMessage failed:', err);
          this.state.isLoading = false;
          this.state.phase = 'error';
          this.state.error = err instanceof Error ? err.message : 'Model init failed';
          this.notifyStateSubscribers();
          this.resolveInit?.();
        }
      }).finally(() => {
        this.initPromise = null;
        this.resolveInit = null;
      });
    }

    return this.initPromise;
  }

  public subscribeEngine(cb: EngineSubscriber): () => void {
    this.engineSubscribers.add(cb);
    if (this.state.phase === 'ready' && this.state.engine) {
      cb(this.state.engine, this.state.webgpuAvailable);
    }
    return () => {
      this.engineSubscribers.delete(cb);
    };
  }

  public subscribeState(cb: (state: Readonly<BGRemoverState>) => void): () => void {
    this.stateSubscribers.add(cb);
    cb(this.state);
    return () => this.stateSubscribers.delete(cb);
  }

  public reset(): void {
    this.cancelIdleRecycle();
    this.clearCapabilityWatchdog();
    this.forceWasm = false;
    this.replayJobsOnReady = false;
    this.worker?.terminate();
    this.worker = null;
    this.resolveInit?.();
    this.jobResolvers.forEach((resolver) => resolver.reject(new Error('Model cache was cleared.')));
    this.jobResolvers.clear();
    this.initPromise = null;
    this.resolveInit = null;
    this.readyModel = null;
    this.state = {
      engine: null,
      webgpuAvailable: false,
      isReady: false,
      isLoading: false,
      progress: 0,
      phase: 'idle',
      error: null,
      fallbackReason: null,
      model: 'chopper',
      readyModel: null,
    };
    this.notifyStateSubscribers();
  }

  private notifyEngineSubscribers() {
    if (!this.state.engine) return;
    this.engineSubscribers.forEach((cb) => {
      try {
        cb(this.state.engine!, this.state.webgpuAvailable);
      } catch (err) {
        console.error('[BGRemoverService] Subscriber callback threw:', err);
      }
    });
  }

  private notifyStateSubscribers() {
    this.stateSubscribers.forEach((cb) => cb(this.state));
  }

  public switchModel(targetModel: BgModelKey): void {
    console.log(`[BGRemoverService] 🔄 Switching active model to "${targetModel}". Terminating old worker to reclaim 100% RAM...`);
    this.cancelIdleRecycle();
    this.clearCapabilityWatchdog();
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
    this.resolveInit = null;
    this.forceWasm = false;
    this.replayJobsOnReady = false;
    // A terminated worker can never answer its jobs; settle them so their
    // progress tickers stop instead of polling forever.
    this.jobResolvers.forEach((resolver) => resolver.reject(new Error('Model switched before the cutout finished.')));
    this.jobResolvers.clear();

    this.readyModel = null;
    this.state.model = targetModel;
    this.state.readyModel = null;
    this.state.engine = null;
    this.state.fallbackReason = null;
    this.state.isReady = false;
    this.state.isLoading = false;
    this.state.phase = 'idle';
    this.state.progress = 0;
    this.state.error = null;
    this.notifyStateSubscribers();
  }

  public unloadModel(model: BgModelKey | 'all'): void {
    console.log(`[Pixelify BG Service] 🧹 Unloading model "${model}": terminating worker to release 100% RAM`);
    this.cancelIdleRecycle();
    this.clearCapabilityWatchdog();
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
    this.resolveInit = null;
    this.forceWasm = false;
    this.replayJobsOnReady = false;
    this.jobResolvers.forEach((resolver) => resolver.reject(new Error('Model unloaded before the cutout finished.')));
    this.jobResolvers.clear();

    this.readyModel = null;
    this.state.readyModel = null;
    this.state.isReady = false;
    this.state.isLoading = false;
    this.state.phase = 'idle';
    this.state.progress = 0;
    this.state.error = null;
    this.state.fallbackReason = null;
    this.state.engine = null;
    this.notifyStateSubscribers();
  }

  public removeBackground(
    id: string,
    url: string,
    onProgress?: ProgressSubscriber,
    onStage?: StageSubscriber,
    model: BgModelKey = "chopper"
  ): Promise<{ blob: Blob; elapsedMs: number }> {
    console.log(`[Pixelify BG Service] 📤 Requesting removeBackground for job: ${id}, model: ${model}, url: ${url?.slice(0, 50)}...`);
    // Only the resident model counts as ready; asking for the other one means
    // its weights/session must still be produced, so no progress may be faked.
    if (this.readyModel !== model) {
      this.readyModel = null;
      this.state.readyModel = null;
      this.state.isReady = false;
    }
    if (this.state.model !== model) {
      this.state.model = model;
      this.notifyStateSubscribers();
    }
    if (model === 'diablo') {
      console.log(`[Diablo Model] 📤 BGRemoverService: Dispatched removeBackground with model="diablo" to worker (Job ID: "${id}")`);
    }
    this.cancelIdleRecycle();
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      this.jobResolvers.set(id, { url, resolve, reject, onProgress, onStage, model });
      worker.postMessage({
        type: 'REMOVE_BG',
        id,
        url,
        model,
        forceWasm: this.shouldForceWasm(model),
        knownWebgpuFailure: readWebGpuFailure(model)?.reason,
        diabloModelUrl: DIABLO_MODEL_URL,
      });
    });
  }

  /**
   * A finished Diablo pass leaves an ONNX session whose WASM/GPU arenas ran into
   * the gigabytes — the worker is a thread in this tab's renderer, so that memory
   * is charged to the page and WASM pages are never handed back to the OS while
   * the worker lives. Retire the idle worker so the tab drops back to baseline.
   * Weights stay in the Cache API, so the next run only rebuilds the session.
   */
  private scheduleIdleRecycle(model: BgModelKey): void {
    if (model !== 'diablo') return;
    this.cancelIdleRecycle();
    this.idleRecycleTimer = window.setTimeout(() => {
      this.idleRecycleTimer = null;
      if (this.jobResolvers.size > 0) return;
      this.recycleIdleWorker();
    }, 6000);
  }

  private cancelIdleRecycle(): void {
    if (this.idleRecycleTimer !== null) {
      window.clearTimeout(this.idleRecycleTimer);
      this.idleRecycleTimer = null;
    }
  }

  /** Tear down an idle worker and mark the model as no longer resident. */
  public recycleIdleWorker(): void {
    this.cancelIdleRecycle();
    if (this.jobResolvers.size > 0 || !this.worker) return;
    console.log('[BGRemoverService] ♻️ Recycling idle worker to return model memory to the OS.');
    this.clearCapabilityWatchdog();
    this.worker.terminate();
    this.worker = null;
    this.initPromise = null;
    this.resolveInit = null;
    this.forceWasm = false;
    this.replayJobsOnReady = false;
    this.readyModel = null;
    this.state.readyModel = null;
    this.state.isReady = false;
    this.state.isLoading = false;
    this.state.phase = 'idle';
    this.state.progress = 0;
    this.state.engine = null;
    this.state.error = null;
    this.notifyStateSubscribers();
  }

  /** Release the worker when the page is left or backgrounded for a while. */
  private bindLifecycleRelease(): void {
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;

    window.addEventListener('pagehide', () => {
      this.recycleIdleWorker();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.hiddenRecycleTimer !== null) return;
        this.hiddenRecycleTimer = window.setTimeout(() => {
          this.hiddenRecycleTimer = null;
          if (document.hidden) this.recycleIdleWorker();
        }, 30000);
      } else if (this.hiddenRecycleTimer !== null) {
        window.clearTimeout(this.hiddenRecycleTimer);
        this.hiddenRecycleTimer = null;
      }
    });
  }

  private startCapabilityWatchdog(worker: Worker): void {
    this.clearCapabilityWatchdog();
    this.capabilityWatchdog = window.setTimeout(() => {
      this.capabilityWatchdog = null;
      if (worker !== this.worker || this.state.phase !== 'detecting') return;
      if (!this.forceWasm) {
        this.restartWithWasm('WebGPU adapter detection timed out. Retrying with WASM.');
      } else {
        this.state.isLoading = false;
        this.state.phase = 'error';
        this.state.error = 'Background worker did not finish initialization.';
        this.notifyStateSubscribers();
        this.resolveInit?.();
      }
    }, 15000);
  }

  private clearCapabilityWatchdog(): void {
    if (this.capabilityWatchdog !== null) {
      window.clearTimeout(this.capabilityWatchdog);
      this.capabilityWatchdog = null;
    }
  }

  private restartWithWasm(reason: string): void {
    if (this.forceWasm) {
      const err = new Error(reason || 'Background removal failed on WASM.');
      this.jobResolvers.forEach((resolver) => resolver.reject(err));
      this.jobResolvers.clear();
      this.state.isLoading = false;
      this.state.isReady = false;
      this.state.phase = 'error';
      this.state.error = err.message;
      this.notifyStateSubscribers();
      this.clearCapabilityWatchdog();
      this.resolveInit?.();
      return;
    }

    this.forceWasm = true;
    this.replayJobsOnReady = this.jobResolvers.size > 0;
    this.worker?.terminate();
    this.worker = null;
    this.readyModel = null;
    this.state.readyModel = null;
    this.state.engine = null;
    this.state.webgpuAvailable = false;
    this.state.isReady = false;
    this.state.isLoading = true;
    this.state.phase = 'detecting';
    this.state.error = null;
    this.state.fallbackReason = reason;
    this.notifyStateSubscribers();

    try {
      const worker = this.getWorker();
      this.startCapabilityWatchdog(worker);
      worker.postMessage({
        type: 'INIT',
        forceWasm: true,
        model: this.state.model,
        knownWebgpuFailure: reason,
        modelUrl: CHOPPER_MODEL_URL,
        diabloModelUrl: DIABLO_MODEL_URL,
      });
    } catch (err) {
      this.state.isLoading = false;
      this.state.phase = 'error';
      this.state.error = err instanceof Error ? err.message : reason;
      this.notifyStateSubscribers();
      this.resolveInit?.();
    }
  }

  public getState(): Readonly<BGRemoverState> {
    return this.state;
  }
}

export const bgRemoverService = new BGRemoverService();
