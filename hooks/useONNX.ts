import { useState, useCallback, useRef } from 'react';
import { detectBackend, MODELS } from '../lib/constants';
import { loadONNX, createSession, isUpscalerModelCached } from '../utils/upscale';
import type { Backend, ModelKey } from '../types';

interface UseONNXReturn {
  ortRef: React.MutableRefObject<any>;
  backend: Backend | null;
  /** Execution provider the loaded session ACTUALLY runs on ('wasm' | 'webgpu') */
  execEngine: 'wasm' | 'webgpu' | null;
  sessionRef: React.MutableRefObject<any>;
  isLoading: boolean;
  /** 0–100 real progress of the in-flight model load; null when idle. */
  modelProgress: number | null;
  initONNX: () => Promise<void>;
  loadModel: (key: ModelKey, opts?: { silentIfCached?: boolean }) => Promise<boolean>;
  unloadModel: () => Promise<void>;
}

export function useONNX(): UseONNXReturn {
  const ortRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const [backend, setBackend] = useState<Backend | null>(null);
  const [execEngine, setExecEngine] = useState<'wasm' | 'webgpu' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const modelLoadsRef = useRef(new Map<ModelKey, { promise: Promise<boolean>; controller: AbortController }>());
  const sessionGenerationRef = useRef(0);

  const initONNX = useCallback(async () => {
    if (ortRef.current) return;
    if (!initPromiseRef.current) {
      setIsLoading(true);
      const initPromise = (async () => {
        try {
          const back = detectBackend();
          setBackend(back);
          const ort = await loadONNX();
          ortRef.current = ort;
        } finally {
          setIsLoading(false);
        }
      })();
      initPromiseRef.current = initPromise;
      const clearInitPromise = () => {
        if (initPromiseRef.current === initPromise) initPromiseRef.current = null;
      };
      void initPromise.then(clearInitPromise, clearInitPromise);
    }
    await initPromiseRef.current;
  }, []);

  const loadModel = useCallback(async (
    key: ModelKey,
    opts?: { silentIfCached?: boolean }
  ): Promise<boolean> => {
    const existingLoad = modelLoadsRef.current.get(key);
    if (existingLoad) return existingLoad.promise;

    const generation = sessionGenerationRef.current;
    const controller = new AbortController();

    // Cached model + silent mode → session compiles with zero download UI,
    // so the navbar badge never appears for already-available models.
    let cached = false;
    if (opts?.silentIfCached) {
      try { cached = await isUpscalerModelCached(key); } catch { cached = false; }
    }
    const showProgressUI = !opts?.silentIfCached || !cached;

    const loadPromise = (async () => {
      if (showProgressUI) {
        setIsLoading(true);
        setModelProgress(0);
      }
      try {
        if (!ortRef.current) await initONNX();
        const session = await createSession(
          ortRef.current,
          key,
          undefined,
          showProgressUI ? setModelProgress : undefined,
          controller.signal
        );
        if (generation !== sessionGenerationRef.current) {
          await (session as any).release?.();
          return false;
        }
        sessionRef.current = session;
        const tagged: string | undefined = (session as any)?.__engine;
        const eps: string[] = (session as any)?.handler?.executionProviders ?? [];
        const engine: 'wasm' | 'webgpu' =
          tagged === 'webgpu' || eps.some((ep) => ep.toLowerCase().includes('webgpu'))
            ? 'webgpu'
            : 'wasm';
        setExecEngine(engine);
        return true;
      } catch (e) {
        if (!controller.signal.aborted) console.error('Failed to load model:', e);
        return false;
      } finally {
        if (showProgressUI && generation === sessionGenerationRef.current) {
          setIsLoading(false);
          setModelProgress(null);
        }
      }
    })();
    const load = { promise: loadPromise, controller };
    modelLoadsRef.current.set(key, load);
    try {
      return await loadPromise;
    } finally {
      if (modelLoadsRef.current.get(key) === load) {
        modelLoadsRef.current.delete(key);
      }
    }
  }, [initONNX]);

  const unloadModel = useCallback(async () => {
    sessionGenerationRef.current += 1;
    const pendingLoads = [...modelLoadsRef.current.values()];
    pendingLoads.forEach(({ controller }) => controller.abort());
    modelLoadsRef.current.clear();
    await Promise.allSettled(pendingLoads.map(({ promise }) => promise));
    const session = sessionRef.current;
    sessionRef.current = null;
    setExecEngine(null);
    setIsLoading(false);
    setModelProgress(null);
    if (session?.release) await session.release();
  }, []);

  return { ortRef, backend, execEngine, sessionRef, isLoading, modelProgress, initONNX, loadModel, unloadModel };
}
