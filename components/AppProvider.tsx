'use client';

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  createContext,
  useContext,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import MobileSidebar from './MobileSidebar';
import CookieNotice from './CookieNotice';

import type {
  Step,
  ModelKey,
  ProcessResult,
  ProgressState,
  EnhancementOptions,
  ViewTab,
  ThemeMode,
  BGJob,
  ToastMessage,
  UpscaleItem,
  ModelDownloadItem,
} from '../types';
import { makeId } from '../lib/bgUtils';
import { useONNX } from '../hooks/useONNX';
import { isUpscalerModelCached } from '../utils/upscale';
import { useUpscale, cancelUpscale } from '../hooks/useUpscale';
import { bgRemoverService } from '../services/bgRemoverService';
import { clearDownloadedModelCaches, requestPersistentModelStorage, subscribeToModelCacheCleared } from '../utils/modelCache';
import { buildPresetOptions, getDefaultPreset, MAX_OUTPUT_DIM, MODELS } from '../lib/constants';
import {
  playSuccessChime,
  primeAudio,
  requestNotificationPermission,
  sendDesktopNotification,
} from '../utils/notifications';
import ScrollToTopButton from './ScrollToTopButton';

const STORAGE_KEY = 'pixelify_upscaler_history_2026'; // legacy, no longer written
const UPSCALER_PRELOAD_ORDER: ModelKey[] = ['vitality'];
const THEME_KEY = 'pixelify_theme_pref';
const MAX_UPSCALER_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_BG_FILE_SIZE = 20 * 1024 * 1024;       // 20 MB

export type SelectSampleHandler = (sampleUrl: string, type: 'upscale' | 'bg_remove') => Promise<void>;

interface AppContextValue {
  activeTab: ViewTab;
  navigateTo: (tab: ViewTab) => void;
  /** Preload the AI plumbing for a tab on hover-intent (idempotent, silent). */
  warmup: (tab: ViewTab) => void;
  /** Models currently downloading (navbar live-download badge). */
  modelDownloads: ModelDownloadItem[];
  addToast: (type: ToastMessage['type'], text: string) => void;
  openPicker: () => void;

  /* BG remover */
  bgJobs: BGJob[];
  setBgJobs: React.Dispatch<React.SetStateAction<BGJob[]>>;
  bgEngine: 'wasm' | 'webgpu' | null;
  setBgEngine: React.Dispatch<React.SetStateAction<'wasm' | 'webgpu' | null>>;
  setBgWebgpuAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  handleBGFiles: (fileList: FileList | File[]) => void;
  loadBgSample: (sampleUrl: string, name: string) => Promise<void>;
  onSelectSample: SelectSampleHandler;

  /* upscaler */
  step: Step;
  items: UpscaleItem[];
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  addUpscaleFile: (file: File) => void;
  modelLoading: boolean;
  modelProgress: number | null;
  execEngine: 'wasm' | 'webgpu' | null;
  onItemModelChange: (id: string, key: ModelKey) => Promise<void>;
  onItemOptionsChange: (id: string, newOptions: EnhancementOptions) => void;
  onResetItemSettings: (id: string) => void;
  onUpscaleItem: (id: string) => Promise<void>;
  onCancelUpscale: (id: string) => void;
  onDownloadItem: (id: string, format?: 'png' | 'webp' | 'jpeg') => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onExitWorkspace: () => void;

  /* model cache / navbar state */
  webgpuAvailable: boolean | null;
  modelStatus: string;
  isClearingModelCache: boolean;
  canClearModelCache: boolean;
  onClearModelCache: () => Promise<void>;
  onOpenMobileSidebar: () => void;
  mobileHidden: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = useCallback((): ViewTab => {
    const path = pathname.replace(/^\//, '').replace(/\/$/, '');
    if (path === '') {
      return 'home';
    }
    if (path === 'upscaler' || path === 'bg_remove') {
      return path as ViewTab;
    }
    if (path === 'blogs' || path.startsWith('blogs/')) {
      return 'blogs' as ViewTab;
    }
    // Static pages (privacy, about, products, terms, story, ...) have no
    // navbar item of their own — nothing should show as highlighted.
    return 'static';
  }, [pathname]);

  const activeTab = getActiveTab();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Mobile navigation sidebar (replaces the old bottom nav bar on < md)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Theme state management
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    return 'dark';
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSelectingSampleRef = useRef(false);

  // Scroll to top helper ensuring top scroll across browsers, routes & layout recalculations
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    // Double rAF ensures dynamically mounted DOM components don't displace scroll
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    });
  }, []);

  // Sync state with client-side navigation & force top scroll
  const navigateTo = useCallback(
    (tab: ViewTab) => {
      const targetPath = tab === 'home' ? '/' : `/${tab}`;
      scrollToTop();
      router.push(targetPath);
      scrollToTop();
    },
    [router, scrollToTop]
  );

  // Automatically scroll to top whenever route changes (Home <-> BG <-> Upscaler, etc.)
  useEffect(() => {
    scrollToTop();
  }, [pathname, scrollToTop]);

  // Prevent browser history auto-restoring stale scroll offsets on route transition
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Theme effect application
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;

    if (theme === 'light') {
      root.classList.add('light');
    } else if (theme === 'dark') {
      root.classList.remove('light');
    } else {
      // System mode
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      if (prefersLight) root.classList.add('light');
      else root.classList.remove('light');
    }
  }, [theme]);

  // Background Remover Jobs State
  const [bgJobs, setBgJobs] = useState<BGJob[]>([]);

  // Upscaler State Hooks
  const { ortRef, execEngine, sessionRef, isLoading: modelLoading, modelProgress, initONNX, loadModel, unloadModel } = useONNX();
  const { upscale } = useUpscale({ ortRef, sessionRef });

  // LIVE ENGINE STATE — what each tool's pipeline is ACTUALLY running on right now.
  const [bgEngine, setBgEngine] = useState<'wasm' | 'webgpu' | null>(null);
  const [bgWebgpuAvailable, setBgWebgpuAvailable] = useState<boolean>(false);
  const [webgpuAvailable, setWebgpuAvailable] = useState<boolean | null>(null);
  const [bgModelPhase, setBgModelPhase] = useState<'idle' | 'detecting' | 'downloading' | 'preparing' | 'ready' | 'error'>('idle');
  const [bgModelProgress, setBgModelProgress] = useState(0);
  const [bgFallbackReason, setBgFallbackReason] = useState<string | null>(null);
  const [upscalerPreloadError, setUpscalerPreloadError] = useState(false);
  const [modelsCleared, setModelsCleared] = useState(false);
  const [isClearingModelCache, setIsClearingModelCache] = useState(false);
  // Name of the upscaler model currently loading — labels the navbar badge.
  const [upscalerActiveName, setUpscalerActiveName] = useState(MODELS.vitality.name);
  const [upscalerActiveKey, setUpscalerActiveKey] = useState<ModelKey>('vitality');
  // First-time preload queue: the other upscaler models that still need to
  // be fetched after the one currently loading (renders 0% rows in panel).
  const [upscalerPreloadQueue, setUpscalerPreloadQueue] = useState<ModelKey[]>([]);
  const [bgDownloadActive, setBgDownloadActive] = useState(false);
  const bgRealDownloadRef = useRef(false);
  const preloadCancelledRef = useRef(false);

  const [step, setStep] = useState<Step>('upload');
  const [items, setItems] = useState<UpscaleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // AI Enhancement options defaults
  const DEFAULT_OPTIONS: EnhancementOptions = {
    scale: 4,
    faceRestore: true,
    removeNoise: true,
    sharpen: true,
    colorEnhance: false,
    hdrBoost: false,
    sharpenLevel: 60,
    removeNoiseLevel: 50,
    faceRestoreLevel: 60,
    sharpness: 50,
    denoise: 50,
    faceEnhancement: 50,
    colorLevel: 50,
    hdrLevel: 50,
    brightness: 50,
    contrast: 50,
    preset: 'Standard',
  };

  // Legacy local history feature was removed; clear any old stored records.
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = makeId();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    let cancelled = false;
    preloadCancelledRef.current = false;
    const unsubscribe = bgRemoverService.subscribeState((state) => {
      setBgModelPhase(state.phase);
      setBgModelProgress(state.progress);
      setBgFallbackReason(state.fallbackReason);
      setBgEngine(state.phase === 'idle' || state.phase === 'detecting' || state.phase === 'error'
        ? null
        : state.engine);
      setBgWebgpuAvailable(state.webgpuAvailable);
      // Cached heavyweight weights report a single 100% "progress" tick per
        // file, which would make the badge flicker on/off between files.
        // A real transfer passes through sub-95% values first — only then
        // do we surface the row, and keep it up until the phase changes.
      if (state.phase === 'downloading') {
        if (state.progress > 0 && state.progress < 95) bgRealDownloadRef.current = true;
        if (bgRealDownloadRef.current) setBgDownloadActive(true);
      } else {
        bgRealDownloadRef.current = false;
        setBgDownloadActive(false);
      }
    });
    const unsubscribeCacheClear = subscribeToModelCacheCleared(() => {
      preloadCancelledRef.current = true;
      bgRemoverService.reset();
      void unloadModel();
      setBgEngine(null);
      setBgModelPhase('idle');
      setBgModelProgress(0);
      setBgFallbackReason(null);
      setUpscalerPreloadError(false);
      setUpscalerPreloadQueue([]);
      setBgDownloadActive(false);
      bgRealDownloadRef.current = false;
      setModelsCleared(true);
      addToast('info', 'Downloaded models were cleared in another tab.');
    });

    const gpu = (navigator as any)?.gpu;
    if (!gpu) {
      setWebgpuAvailable(false);
    } else {
      let timeoutId: number | undefined;
      const timeout = new Promise<null>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(null), 4500);
      });
      void Promise.race([gpu.requestAdapter(), timeout]).then(
        (adapter: unknown) => {
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
          if (!cancelled) setWebgpuAvailable(!!adapter);
        },
        () => {
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
          if (!cancelled) setWebgpuAvailable(false);
        }
      );
    }
    void requestPersistentModelStorage();

    const preloadModels = async () => {
      try {
        if (cancelled || preloadCancelledRef.current) return;
        const bgPreload = bgRemoverService.init();
        // Probe caches BEFORE touching any badge state: a fully-cached visit
        // then performs ZERO navbar updates (no icon flicker), while real
        // downloads still show the full plan during runtime init.
        const targets: ModelKey[] = [];
        for (const key of UPSCALER_PRELOAD_ORDER) {
          if (cancelled || preloadCancelledRef.current) return;
          let cached = false;
          try { cached = await isUpscalerModelCached(key); } catch { cached = false; }
          if (!cached) targets.push(key);
        }
        if (targets.length > 0) setUpscalerPreloadQueue(targets);
        await initONNX();
        if (cancelled || preloadCancelledRef.current) return;
        // Pre-warm ONLY the default upscaler model (Vitality). Heavy
        // variants (Pixel-Dance, Alpha-Satoru) stay on-demand.
        for (const key of targets) {
          if (cancelled || preloadCancelledRef.current) return;
          setActiveUpscalerModel(key);
          const ok = await loadModel(key, { silentIfCached: true });
          if (key === 'vitality' && !cancelled) setUpscalerPreloadError(!ok);
          setUpscalerPreloadQueue((q) => q.filter((k) => k !== key));
        }
        setUpscalerPreloadQueue([]);
        void bgPreload;
      } catch (err) {
        if (!cancelled) {
          setUpscalerPreloadError(true);
          console.warn('AI model preload failed; models will retry when used:', err);
        }
      }
    };

    const requestIdleCallback = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout: number }) => number)
      | undefined;
    const cancelIdleCallback = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
    const idleId = requestIdleCallback
      ? requestIdleCallback(() => { void preloadModels(); }, { timeout: 1800 })
      : null;
    const timerId = idleId === null ? window.setTimeout(() => { void preloadModels(); }, 900) : null;

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeCacheClear();
      if (idleId !== null) cancelIdleCallback?.(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [addToast, initONNX, loadModel, unloadModel]);

  const handleClearModelCache = useCallback(async () => {
    if (isClearingModelCache) return;
    preloadCancelledRef.current = true;
    setIsClearingModelCache(true);
    try {
      bgRemoverService.reset();
      await unloadModel();
      await clearDownloadedModelCaches();
      setBgEngine(null);
      setBgModelPhase('idle');
      setBgModelProgress(0);
      setBgFallbackReason(null);
      setUpscalerPreloadError(false);
      setUpscalerPreloadQueue([]);
      setBgDownloadActive(false);
      bgRealDownloadRef.current = false;
      setModelsCleared(true);
      addToast('success', 'Downloaded AI models cleared from this browser.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Could not clear downloaded models.');
    } finally {
      setIsClearingModelCache(false);
    }
  }, [addToast, isClearingModelCache, unloadModel]);

/** Marks which upscaler model the navbar badge should currently label. */
const setActiveUpscalerModel = (key: ModelKey) => {
  setUpscalerActiveKey(key);
  setUpscalerActiveName(MODELS[key].name);
};

/* ----------------------------------------------------------
   MODEL WARMUP (hover-intent preloading)
     The idle preload covers most visits, but a user hovering a
     CTA before that fires gets the runtime + model moving right
     away instead of on click. Fully idempotent: init/load paths
     guard themselves, and failures stay silent here (the click
     path surfaces real errors).
     ---------------------------------------------------------- */
  const warmup = useCallback(
    (tab: ViewTab) => {
      try {
        if (tab === 'upscaler') {
          // Idle preload already covers all models — don't double-load.
          if (!sessionRef.current && !modelLoading) {
            void (async () => {
              try {
                await initONNX();
                setActiveUpscalerModel('vitality');
                await loadModel('vitality', { silentIfCached: true });
              } catch { /* silent: click path handles errors */ }
            })();
          }
        } else if (tab === 'bg_remove') {
          void bgRemoverService.init();
        }
      } catch { /* silent */ }
    },
    [initONNX, loadModel, modelLoading, sessionRef]
  );

  /* ----------------------------------------------------------
     LIVE MODEL DOWNLOAD LIST (navbar badge)
     One row per model currently transferring into the browser
     cache. Empty when everything is available → icon hidden.
     ---------------------------------------------------------- */
  const modelDownloads = useMemo<ModelDownloadItem[]>(() => {
    const out: ModelDownloadItem[] = [];
    // Only real transfers (progress events) surface — runtime init or
    // session-compile of already-cached models must NOT flash the badge.
    if (modelLoading && modelProgress !== null) {
      out.push({ id: 'upscaler', name: upscalerActiveName, progress: Math.round(modelProgress) });
    }
    // Queued preload models show as pending (0%) rows so the badge reflects
    // the full first-visit download plan, not just the active transfer.
    for (const key of upscalerPreloadQueue) {
      if (modelLoading && modelProgress !== null && key === upscalerActiveKey) continue;
      out.push({ id: `queued-${key}`, name: MODELS[key].name, progress: 0 });
    }
    // Cached Chopper reports a 100% progress tick — that's not a download;
    // bgDownloadActive goes true only once a real <95% transfer tick lands.
    if (bgModelPhase === 'downloading' && bgDownloadActive) {
      out.push({ id: 'bg-remove', name: 'Chopper · BG remover', progress: Math.round(bgModelProgress) });
    }
    return out;
  }, [modelLoading, modelProgress, upscalerActiveName, upscalerActiveKey, upscalerPreloadQueue, bgModelPhase, bgModelProgress, bgDownloadActive]);

  /* ----------------------------------------------------------
     ADD UPSCALE FILE (Creates individual UpscaleItem)
     ---------------------------------------------------------- */
  const addUpscaleFile = useCallback((file: File) => {
    if (file.size > MAX_UPSCALER_FILE_SIZE) {
      addToast('error', 'Please choose an image under 15 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (width * DEFAULT_OPTIONS.scale > MAX_OUTPUT_DIM || height * DEFAULT_OPTIONS.scale > MAX_OUTPUT_DIM) {
        const supports2x = width * 2 <= MAX_OUTPUT_DIM && height * 2 <= MAX_OUTPUT_DIM;
        addToast(
          'info',
          supports2x
             ? `Image too large for 4x/8x. Select 2x to stay within the limit.`
            : `Choose 2x to stay under the limit.`
        );
      }
      const newItem: UpscaleItem = {
        id: makeId(),
        file,
        name: file.name,
        url,
        img,
        width,
        height,
        size: file.size,
        status: 'idle',
        progress: { percent: 0, text: '' },
        result: null,
        error: null,
        options: { ...DEFAULT_OPTIONS },
        modelKey: 'vitality',
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedId(newItem.id);
      setStep('config');
      setActiveUpscalerModel('vitality');
      loadModel('vitality', { silentIfCached: true });
      scrollToTop();
    };
    img.onerror = () => {
      addToast('error', 'Failed to load image file.');
    };
    img.src = url;
  }, [addToast, loadModel, scrollToTop]);

  /* ----------------------------------------------------------
     HANDLE MODEL CHANGE (Per image)
     ---------------------------------------------------------- */
  const handleItemModelChange = useCallback(
    async (id: string, key: ModelKey) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
              ...i,
              modelKey: key,
              result: null,
              error: null,
              options: buildPresetOptions(
                key,
                MODELS[key]?.defaultPreset || getDefaultPreset(key),
                i.options
              ),
            }
            : i
        )
      );
      setActiveUpscalerModel(key);
      // User picked a model manually — stop racing the background preload
      // and drop its pending badge rows.
      preloadCancelledRef.current = true;
      setUpscalerPreloadQueue([]);
      const ok = await loadModel(key, { silentIfCached: true });
      if (!ok) {
        addToast('error', `Failed to load ${MODELS[key]?.name || key} model.`);
      }
    },
    [loadModel, addToast]
  );

  /* ----------------------------------------------------------
     HANDLE OPTIONS CHANGE (Per image)
     ---------------------------------------------------------- */
  const handleItemOptionsChange = useCallback((id: string, newOptions: EnhancementOptions) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, options: newOptions } : i))
    );
  }, []);

  /* ----------------------------------------------------------
     RESET SETTINGS (Per image) — back to the model's default preset
     ---------------------------------------------------------- */
  const handleResetItemSettings = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const preset =
          MODELS[i.modelKey]?.defaultPreset || getDefaultPreset(i.modelKey);
        return {
          ...i,
          options: buildPresetOptions(i.modelKey, preset, { ...DEFAULT_OPTIONS, preset }),
        };
      })
    );
    addToast('info', 'Settings reset to defaults.');
  }, [addToast]);

  /* ----------------------------------------------------------
     HANDLE UPSCALE (Runs strictly per image in background)
     ---------------------------------------------------------- */
  const handleUpscaleItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.status === 'processing' || modelLoading) return;

      const outputWidth = Math.round(item.width * item.options.scale);
      const outputHeight = Math.round(item.height * item.options.scale);
      if (outputWidth > MAX_OUTPUT_DIM || outputHeight > MAX_OUTPUT_DIM) {
        const supports2x = item.width * 2 <= MAX_OUTPUT_DIM && item.height * 2 <= MAX_OUTPUT_DIM;
        addToast(
          'info',
          supports2x
            ? `Image too large for 4x/8x. Select 2x to stay within the limit.`
            : `Choose 2x to stay under the limit.`
        );
        setItems((prev) => prev.map((entry) => entry.id === id
          ? { ...entry, status: 'idle', error: null, progress: { percent: 0, text: '' } }
          : entry));
        return;
      }

      // Prime audio context and ask for browser notification permission on user gesture
      primeAudio();
      requestNotificationPermission().catch(() => { });

      // Mark ONLY this specific item as processing
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
              ...i,
              status: 'processing',
              error: null,
              progress: { percent: 5, text: 'Preparing neural model...' },
            }
            : i
        )
      );

      try {
        const res = await upscale(
          id,
          item.img,
          item.modelKey,
          item.options,
          (p: ProgressState) => {
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, progress: p } : i))
            );
          }
        );

        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                ...i,
                status: 'completed',
                result: res,
                progress: { percent: 100, text: 'Complete!' },
              }
              : i
          )
        );

        // Play pleasant completion chime & send desktop notification
        playSuccessChime();
        sendDesktopNotification(
          '✨ Image Upscaled!',
          `${item.name} (${item.options.scale}×) is ready.`,
          item.url
        );
        addToast(
          'success',
          `✨ ${item.name} upscaled successfully! (${item.options.scale}×, ${(res.time / 1000).toFixed(1)}s)`
        );
      } catch (err: any) {
        // A user cancel was already handled by handleCancelUpscale (item is idle).
        if (err?.name === 'CancellationError' || /cancel/i.test(err?.message || '')) {
          return;
        }
        const isOutputLimit = /Output would be .*exceeding the .* limit/i.test(err?.message || '');
        if (isOutputLimit) {
          const supports2x = item.width * 2 <= MAX_OUTPUT_DIM && item.height * 2 <= MAX_OUTPUT_DIM;
          addToast('info', supports2x
            ? `This image is too large for ${item.options.scale}×. Choose 2× to stay within the output limit.`
            : 'This image is too large for the supported output limit. Use a smaller source image.');
          setItems((prev) => prev.map((entry) => entry.id === id
            ? { ...entry, status: 'idle', error: null, progress: { percent: 0, text: '' } }
            : entry));
          return;
        }
        console.error(`Upscaling failed for ${item.name}:`, err);
        const userMessage = 'Could not upscale this image. Please retry, or choose a smaller image if the problem continues.';
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                ...i,
                status: 'error',
                error: userMessage,
                progress: { percent: 0, text: '' },
              }
              : i
          )
        );
        addToast('error', userMessage);
      }
    },
    [items, modelLoading, upscale, addToast]
  );

  /* ----------------------------------------------------------
     CANCEL UPSCALE (Per item)
     ---------------------------------------------------------- */
  const handleCancelUpscale = useCallback((id: string) => {
    cancelUpscale(id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
            ...i,
            status: 'idle',
            error: null,
            progress: { percent: 0, text: '' },
          }
          : i
      )
    );
    addToast('info', 'Enhancement cancelled.');
  }, [addToast]);

  /* ----------------------------------------------------------
     REMOVE / CLEAR ITEMS
     ---------------------------------------------------------- */
  const handleRemoveItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        if (next.length === 0) {
          setSelectedId(null);
          setStep('upload');
        } else if (selectedId === id) {
          setSelectedId(next[0].id);
        }
        return next;
      });
    },
    [selectedId]
  );

  const handleClearAll = useCallback(() => {
    setItems([]);
    setSelectedId(null);
    setStep('upload');
  }, []);

  /* ----------------------------------------------------------
     EXIT WORKSPACE (mobile X / desktop close) — back to upload.
     ---------------------------------------------------------- */
  const handleExitWorkspace = useCallback(() => {
    setStep('upload');
  }, []);

  // Returning to the upload step must land at the TOP of the page
  useEffect(() => {
    if (step === 'upload') {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => window.scrollTo(0, 0))
      );
    }
  }, [step]);

  /* ----------------------------------------------------------
     DOWNLOAD RESULT (Per image)
     ---------------------------------------------------------- */
  const handleDownloadItem = useCallback(
    (id: string, format: 'png' | 'webp' | 'jpeg' = 'png') => {
      const item = items.find((i) => i.id === id);
      if (!item || !item.result) return;
      const res = item.result;
      const canvas = document.createElement('canvas');
      canvas.width = res.width;
      canvas.height = res.height;
      const ctx = canvas.getContext('2d')!;
      const rgbaClone = new Uint8ClampedArray(res.rgba);
      ctx.putImageData(new ImageData(rgbaClone, res.width, res.height), 0, 0);

      const mime = format === 'webp' ? 'image/webp' : format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'webp' ? 'webp' : format === 'jpeg' ? 'jpg' : 'png';

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const baseName = item.name.replace(/\.[^/.]+$/, '');
          a.download = `${baseName}_upscaled_${item.options.scale}x.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
        },
        mime,
        0.95
      );
    },
    [items]
  );

  // Global File Picker Handler for BG Remove
  const handleBGFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const valid = files.filter((f) => f.type.startsWith('image/') && f.size <= MAX_BG_FILE_SIZE);
    if (!valid.length) {
      addToast('error', 'Please choose images under 20 MB.');
      return;
    }
    if (valid.length < files.length) {
      addToast('error', 'Some images exceeded the 20 MB limit and were skipped.');
    }
    const additions: BGJob[] = valid.map((file) => ({
      id: makeId(),
      file,
      name: file.name,
      sourceUrl: URL.createObjectURL(file),
      resultUrl: null,
      resultBlob: null,
      status: 'ready',
      progress: 0,
      message: 'Queued for cutout processing',
    }));
    setBgJobs((prev) => [...prev, ...additions]);
    navigateTo('bg_remove');
    scrollToTop();
    addToast('success', `${additions.length} image(s) added to Cutout Canvas.`);
  }, [addToast, navigateTo, scrollToTop]);

  // Load a BG-remover sample image from the landing sections onto the canvas
  const loadBgSample = useCallback(async (sampleUrl: string, name: string) => {
    if (isSelectingSampleRef.current) return;
    isSelectingSampleRef.current = true;
    try {
      const res = await fetch(sampleUrl);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const file = new File([blob], `${name.toLowerCase().replace(/\s+/g, '_')}.png`, { type: blob.type || 'image/png' });
      handleBGFiles([file]);
      scrollToTop();
    } catch {
      addToast('error', 'Could not load sample.');
    } finally {
      setTimeout(() => {
        isSelectingSampleRef.current = false;
      }, 600);
    }
  }, [handleBGFiles, scrollToTop, addToast]);

  // Load an upscaler or bg sample from the home demo grid
  const handleSelectSample: SelectSampleHandler = useCallback(async (sampleUrl: string, type: 'upscale' | 'bg_remove') => {
    if (isSelectingSampleRef.current) return;
    isSelectingSampleRef.current = true;
    try {
      const res = await fetch(sampleUrl);
      if (!res.ok) throw new Error('Failed to load sample');
      const blob = await res.blob();
      const file = new File([blob], 'sample.jpg', { type: blob.type || 'image/jpeg' });
      scrollToTop();
      if (type === 'upscale') {
        addUpscaleFile(file);
        navigateTo('upscaler');
      } else {
        handleBGFiles([file]);
      }
      scrollToTop();
    } catch (err) {
      addToast('error', 'Could not load sample.');
      throw err;
    } finally {
      setTimeout(() => {
        isSelectingSampleRef.current = false;
      }, 600);
    }
  }, [addToast, addUpscaleFile, handleBGFiles, navigateTo, scrollToTop]);

  const modelStatus = bgFallbackReason && bgEngine === 'wasm'
    ? `Standard mode: ${bgFallbackReason.slice(0, 110)}`
    : bgModelPhase === 'downloading'
    ? `Downloading background-removal model (${Math.round(bgModelProgress)}%)`
    : bgModelPhase === 'preparing'
      ? 'Preparing background-removal model'
      : bgModelPhase === 'detecting'
        ? 'Checking graphics adapter'
        : bgModelPhase === 'error'
          ? 'Background model preload failed; it will retry when used'
          : modelLoading
            ? `Preparing upscaler model${modelProgress === null ? '' : ` (${Math.round(modelProgress)}%)`}`
            : upscalerPreloadError && !execEngine
              ? 'Upscaler model preload failed; it will retry when used'
              : bgModelPhase === 'ready' && execEngine
                ? 'Default AI models are ready in this browser'
                : modelsCleared && execEngine
                  ? 'Upscaler model ready; other models load when used'
                  : modelsCleared
                    ? 'Models cleared; they will download again when needed'
                    : 'Preparing AI models in the background';
  const canClearModelCache = !bgJobs.some((job) => job.status === 'loading' || job.status === 'processing')
    && !items.some((item) => item.status === 'processing')
    && !isClearingModelCache;

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onOpenMobileSidebar = useCallback(() => {
    setIsMobileNavOpen(true);
  }, []);

  const mobileHidden = activeTab === 'upscaler' && step !== 'upload';

  const value: AppContextValue = {
    activeTab,
    navigateTo,
    warmup,
    modelDownloads,
    addToast,
    openPicker,

    bgJobs,
    setBgJobs,
    bgEngine,
    setBgEngine,
    setBgWebgpuAvailable,
    handleBGFiles,
    loadBgSample,
    onSelectSample: handleSelectSample,

    step,
    items,
    selectedId,
    setSelectedId,
    addUpscaleFile,
    modelLoading,
    modelProgress,
    execEngine,
    onItemModelChange: handleItemModelChange,
    onItemOptionsChange: handleItemOptionsChange,
    onResetItemSettings: handleResetItemSettings,
    onUpscaleItem: handleUpscaleItem,
    onCancelUpscale: handleCancelUpscale,
    onDownloadItem: handleDownloadItem,
    onRemoveItem: handleRemoveItem,
    onClearAll: handleClearAll,
    onExitWorkspace: handleExitWorkspace,

    webgpuAvailable: webgpuAvailable ?? null,
    modelStatus,
    isClearingModelCache,
    canClearModelCache,
    onClearModelCache: handleClearModelCache,
    onOpenMobileSidebar,
    mobileHidden,
  };

  return (
    <AppContext.Provider value={value}>
      <div className="app-shell min-h-screen font-sans bg-grid-pattern relative flex flex-col">
        {/* TOAST MESSAGES */}
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type === 'error' ? 'error' : ''}`}>
              <span>{t.type === 'error' ? '!' : '✓'}</span>
              <p className="m-0 font-medium">{t.text}</p>
            </div>
          ))}
        </div>

        {/* HIDDEN FILE INPUT FOR BG REMOVE */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) handleBGFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {/* STICKY NAVBAR — hides on mobile while the upscaler workspace owns the screen */}
        <Navbar
          activeTab={activeTab}
          onTabChange={navigateTo}
          modelDownloads={modelDownloads}
          upscalerEngine={execEngine}
          bgEngine={bgEngine}
          webgpuAvailable={webgpuAvailable ?? (bgWebgpuAvailable ? true : null)}
          modelStatus={modelStatus}
          isClearingModelCache={isClearingModelCache}
          canClearModelCache={canClearModelCache}
          onClearModelCache={handleClearModelCache}
          onOpenMobileSidebar={onOpenMobileSidebar}
          mobileHidden={mobileHidden}
        />

        {/* MOBILE NAVIGATION SIDEBAR (replaces the old bottom nav on < md) */}
        <MobileSidebar
          open={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setIsMobileNavOpen(false);
            navigateTo(tab);
          }}
          upscalerEngine={execEngine}
          bgEngine={bgEngine}
          webgpuAvailable={webgpuAvailable ?? (bgWebgpuAvailable ? true : null)}
          modelStatus={modelStatus}
          isClearingModelCache={isClearingModelCache}
          canClearModelCache={canClearModelCache}
          onClearModelCache={handleClearModelCache}
        />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 w-full mx-auto transition-all duration-300 w-full max-w-none p-0">
          {children}
        </main>

        <ScrollToTopButton />

        {/* COOKIE NOTICE (bottom sheet, until "Done") */}
        <CookieNotice />
      </div>
    </AppContext.Provider>
  );
}
