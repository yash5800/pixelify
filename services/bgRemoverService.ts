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
}

export type EngineSubscriber = (engine: BGEngine, webgpuAvailable: boolean) => void;
export type ProgressSubscriber = (pct: number, isWeights?: boolean, file?: string) => void;
export type StageSubscriber = (stage: string, message?: string) => void;

interface JobResolver {
  url: string;
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
  };
  private initPromise: Promise<void> | null = null;
  private resolveInit: (() => void) | null = null;
  private forceWasm = false;
  private replayJobsOnReady = false;
  private capabilityWatchdog: number | null = null;

  public getWorker(): Worker {
    if (!this.worker) {
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
          this.notifyStateSubscribers();
          this.jobResolvers.forEach((resolver) => {
            resolver.onProgress?.(msg.progress, msg.isWeights, msg.file);
          });
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
          } else if (this.state.webgpuAvailable && this.state.engine === 'wasm') {
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
              this.worker?.postMessage({ type: 'REMOVE_BG', id, url: resolver.url });
            });
          }
          return;
        }

        if (msg.type === 'ENGINE_FALLBACK') {
          this.state.engine = 'wasm';
          this.state.fallbackReason = typeof msg.reason === 'string'
            ? `${msg.stage || 'WebGPU'}: ${msg.reason}`
            : 'WebGPU initialization or inference failed.';
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
          if (msg.reason) {
            this.state.fallbackReason = msg.reason;
          } else if (this.state.webgpuAvailable && this.state.engine === 'wasm') {
            this.state.fallbackReason = 'Mobile device: Standard mode used to prevent browser memory crashes.';
          }
          this.notifyEngineSubscribers();
          this.notifyStateSubscribers();
          this.resolveInit?.();
          return;
        }

        if (msg.type === 'DONE') {
          const entry = this.jobResolvers.get(msg.id);
          if (entry) {
            this.jobResolvers.delete(msg.id);
            entry.resolve({ blob: msg.blob, elapsedMs: msg.elapsedMs });
          }
          return;
        }

        if (msg.type === 'ERROR') {
          const errMsg = msg.message || 'Cutout failed';
          if (msg.engineFailed && !this.forceWasm) {
            this.restartWithWasm(errMsg);
            return;
          }
          if (msg.id == null) {
            this.state.error = errMsg;
            this.state.isLoading = false;
            this.state.isReady = false;
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

    if (this.state.isReady) return Promise.resolve();

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
          worker.postMessage({ type: 'INIT', forceWasm: this.forceWasm });
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
    this.state = {
      engine: null,
      webgpuAvailable: false,
      isReady: false,
      isLoading: false,
      progress: 0,
      phase: 'idle',
      error: null,
      fallbackReason: null,
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

  public removeBackground(
    id: string,
    url: string,
    onProgress?: ProgressSubscriber,
    onStage?: StageSubscriber
  ): Promise<{ blob: Blob; elapsedMs: number }> {
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      this.jobResolvers.set(id, { url, resolve, reject, onProgress, onStage });
      worker.postMessage({ type: 'REMOVE_BG', id, url });
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
      worker.postMessage({ type: 'INIT', forceWasm: true });
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
