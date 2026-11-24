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
import OfflineNoticeBanner from './OfflineNoticeBanner';

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
import { makeId, formatBytes } from '../lib/bgUtils';
import { useLiteRT } from '../hooks/useLiteRT';
import { useUpscale, cancelUpscale } from '../hooks/useUpscale';
import { bgRemoverService } from '../services/bgRemoverService';
import { clearDownloadedModelCaches, requestPersistentModelStorage, subscribeToModelCacheCleared } from '../utils/modelCache';
import { buildPresetOptions, getDefaultPreset, MAX_OUTPUT_DIM, MODELS } from '../lib/constants';
import {
  checkUpscaleBudget,
  formatPixels,
  MAX_SOURCE_PIXELS,
} from '../utils/memoryBudget';
import {
  playSuccessChime,
  primeAudio,
  requestNotificationPermission,
  sendDesktopNotification,
} from '../utils/notifications';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SITE_LANGUAGES } from '../lib/i18n';
import { getDictionary } from '../locales';
import ScrollToTopButton from './ScrollToTopButton';
import { awardPoint } from '@/lib/visitor';

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
  handleBGFiles: (fileList: FileList | File[], showToast?: boolean) => void;
  loadBgSample: (sampleUrl: string, name: string) => Promise<void>;
  onSelectSample: SelectSampleHandler;

  /* upscaler */
  step: Step;
  items: UpscaleItem[];
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  addUpscaleFile: (file: File, autoProcess?: boolean) => void;
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
  isMobileSidebarOpen: boolean;
  mobileHidden: boolean;
  isOnline: boolean;
  /* language */
  currentLang: string;
  setCurrentLang: (lang: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export function useAppOptional(): AppContextValue | null {
  return useContext(AppContext);
}

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = useCallback((): ViewTab => {
    let path = pathname.replace(/^\//, '').replace(/\/$/, '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 0 && SITE_LANGUAGES.some((l) => l.code === parts[0])) {
      parts.shift();
      path = parts.join('/');
    }

    if (path === '') {
      return 'home';
    }
    if (path === 'upscaler' || path === 'bg_remove') {
      return path as ViewTab;
    }
    if (path === 'blog' || path.startsWith('blog/')) {
      return 'blog' as ViewTab;
    }
    // Static pages (privacy, about, products, terms, story, ...) have no
    // navbar item of their own - nothing should show as highlighted.
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

  // Global language state
  const [currentLang, setCurrentLangState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    const path = window.location.pathname;
    const segments = path.replace(/^\//, '').split('/').filter(Boolean);
    if (segments.length > 0 && SITE_LANGUAGES.some((l) => l.code === segments[0])) {
      return segments[0];
    }
    if (path.startsWith('/blog/')) {
      const blogSeg = segments[1];
      if (blogSeg && SITE_LANGUAGES.some((l) => l.code === blogSeg)) {
        return blogSeg;
      }
    }
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
  });

  const setCurrentLang = useCallback((lang: string) => {
    setCurrentLangState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.cookie = `${LANGUAGE_STORAGE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  // Sync currentLang whenever pathname contains a language prefix
  useEffect(() => {
    if (!pathname) return;
    const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
    const firstSegment = segments[0];
    if (firstSegment && SITE_LANGUAGES.some((l) => l.code === firstSegment)) {
      if (currentLang !== firstSegment) {
        setCurrentLangState(firstSegment);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, firstSegment);
        }
      }
    } else if (pathname.startsWith('/blog/')) {
      const blogSeg = segments[1];
      if (blogSeg && SITE_LANGUAGES.some((l) => l.code === blogSeg)) {
        if (currentLang !== blogSeg) {
          setCurrentLangState(blogSeg);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, blogSeg);
          }
        }
      }
    }
  }, [pathname, currentLang]);

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

  // Sync state with client-side navigation & force top scroll with language prefix preservation
  const navigateTo = useCallback(
    (tab: ViewTab) => {
      let langPrefix = '';
      if (pathname) {
        const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
        if (segments.length > 0 && SITE_LANGUAGES.some((l) => l.code === segments[0])) {
          langPrefix = `/${segments[0]}`;
        }
      }
      if (!langPrefix && currentLang && currentLang !== DEFAULT_LANGUAGE) {
        langPrefix = `/${currentLang}`;
      } else if (!langPrefix && currentLang === DEFAULT_LANGUAGE && pathname && pathname.startsWith('/en/')) {
        langPrefix = '/en';
      }

      let targetPath = '';
      if (tab === 'home') {
        targetPath = langPrefix ? `${langPrefix}/` : '/';
      } else if (tab === 'blog') {
        const langCode = langPrefix ? langPrefix.replace('/', '') : (currentLang || DEFAULT_LANGUAGE);
        targetPath = langCode === 'en' ? '/blog/' : `/blog/${langCode}/`;
      } else {
        targetPath = langPrefix ? `${langPrefix}/${tab}/` : `/${tab}/`;
      }

      scrollToTop();
      router.push(targetPath);
      scrollToTop();
    },
    [router, scrollToTop, pathname, currentLang]
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
  const { runtimeRef, execEngine, sessionRef, isLoading: modelLoading, modelProgress, isPrefetching: modelPrefetching, initLiteRT, loadModel, unloadModel } = useLiteRT();
  const { upscale } = useUpscale({ runtimeRef, sessionRef });

  // LIVE ENGINE STATE - what each tool's pipeline is ACTUALLY running on right now.
  const [bgEngine, setBgEngine] = useState<'wasm' | 'webgpu' | null>(null);
  const [bgWebgpuAvailable, setBgWebgpuAvailable] = useState<boolean>(false);
  const [webgpuAvailable, setWebgpuAvailable] = useState<boolean | null>(null);
  const [bgModelLoadName, setBgModelLoadName] = useState<"Chopper" | "Diablo">("Chopper");
  const [bgModelPhase, setBgModelPhase] = useState<'idle' | 'detecting' | 'downloading' | 'preparing' | 'ready' | 'error'>('idle');
  const [bgModelProgress, setBgModelProgress] = useState(0);
  const [bgFallbackReason, setBgFallbackReason] = useState<string | null>(null);
  const [upscalerPreloadError, setUpscalerPreloadError] = useState(false);
  const [modelsCleared, setModelsCleared] = useState(false);
  const [isClearingModelCache, setIsClearingModelCache] = useState(false);
  // Name of the upscaler model currently loading - labels the navbar badge.
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
  const pendingAutoUpscaleIdRef = useRef<string | null>(null);

  // Network connection state (Offline / Online detection)
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });
  const [justReconnected, setJustReconnected] = useState(false);
  const [isOfflineBannerOpen, setIsOfflineBannerOpen] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineBannerOpen(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsOfflineBannerOpen(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Service Worker registration & Route prefetching for offline resilience
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.debug('ServiceWorker registration skipped or failed:', err);
        });
      } else {
        // In development, unregister any active service worker and clear cache to avoid stale chunk caching and hydration mismatches
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              if (key.startsWith('pixelify-cache')) {
                caches.delete(key);
              }
            }
          });
        }
      }
    }

    try {
      router.prefetch('/');
      router.prefetch('/upscaler');
      router.prefetch('/bg_remove');
    } catch {
      // prefetch silently handled
    }
  }, [router]);

  // Canva-style Unsaved Changes Confirmation on reload or tab close
  const hasUnsavedWork = useMemo(() => {
    const hasUpscalerItems = items.length > 0;
    const isUpscaling = items.some((i) => i.status === 'processing');
    const hasBgJobs = bgJobs.length > 0;
    const isBgProcessing = bgJobs.some((j) => j.status === 'loading' || j.status === 'processing');

    return hasUpscalerItems || isUpscaling || hasBgJobs || isBgProcessing;
  }, [items, bgJobs]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork) {
        e.preventDefault();
        // Modern standard for browser native "Reload site? Changes you made may not be saved." prompt
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedWork]);

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
      setBgModelLoadName(state.model === "diablo" ? "Diablo" : "Chopper");
      setBgFallbackReason(state.fallbackReason);
      setBgEngine(state.phase === 'idle' || state.phase === 'detecting' || state.phase === 'error'
        ? null
        : state.engine);
      setBgWebgpuAvailable(state.webgpuAvailable);
      // Cached heavyweight weights report a single 100% "progress" tick per
      // file, which would make the badge flicker on/off between files.
      // A real transfer passes through sub-95% values first - only then
      // do we surface the row, and keep it up until the phase changes.
      if (state.phase === 'downloading') {
        if (state.progress >= 0 && state.progress < 95) bgRealDownloadRef.current = true;
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

    const routeSegments = pathname?.split('/').filter(Boolean) ?? [];
    const pageSegments = routeSegments.length > 0 && SITE_LANGUAGES.some((l) => l.code === routeSegments[0])
      ? routeSegments.slice(1)
      : routeSegments;
    const isUpscalerRoute = pageSegments.join('/') === 'upscaler';
    const isBgPage = pageSegments.join('/') === 'bg_remove';
    const isHomeRoute = pageSegments.length === 0;

    const preloadModels = async () => {
      try {
        if (cancelled || preloadCancelledRef.current) return;

        if (isBgPage) {
          // On background removal route: ONLY pre-warm background remover service
          await bgRemoverService.init();
          return;
        }

        if (isUpscalerRoute || isHomeRoute) {
          // Warm only the lightweight default upscaler on Home and its own
          // route. This gives the session time to compile before an image is
          // selected without starting the much larger BG-removal download.
          // A cached model file still needs a fresh in-memory session after a
          // page load; silentIfCached only suppresses transfer percentages.
          if (!cancelled && !preloadCancelledRef.current) {
            await initLiteRT();
            if (cancelled || preloadCancelledRef.current) return;

            setActiveUpscalerModel('vitality');
            const ok = await loadModel('vitality', { silentIfCached: true, background: true });
            if (!cancelled) setUpscalerPreloadError(!ok);
          }
          return;
        }

        // Landing / general pages run no AI. Warming BOTH stacks there used to
        // cost several hundred MB of resident memory (two WASM runtimes + the
        // Chopper pipeline) on a page that only shows static demos. Intent is
        // still covered: hovering a CTA warms via warmup(), and each tool route
        // preloads its own stack on mount.
        return;
      } catch (err) {
        if (!cancelled) {
          setUpscalerPreloadError(true);
          console.warn('AI model preload failed; models will retry when used:', err);
        }
      } finally {
        if (!cancelled) {
          setUpscalerPreloadQueue([]);
        }
      }
    };

    const requestIdleCallback = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout: number }) => number)
      | undefined;
    const cancelIdleCallback = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
    // Begin on the upscaler route immediately; warm Home in idle time so the
    // user can move to the tool and pick an image while LiteRT compiles.
    const idleId = !isUpscalerRoute && isHomeRoute && requestIdleCallback
      ? requestIdleCallback(() => { void preloadModels(); }, { timeout: 1800 })
      : null;
    const timerId = isHomeRoute && idleId === null
      ? window.setTimeout(() => { void preloadModels(); }, 900)
      : null;
    if (isUpscalerRoute) void preloadModels();

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeCacheClear();
      if (idleId !== null) cancelIdleCallback?.(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [addToast, initLiteRT, loadModel, unloadModel, pathname]);

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
      preloadCancelledRef.current = false;
    }
  }, [addToast, isClearingModelCache, unloadModel]);

  /** Marks which upscaler model the navbar badge should currently label. */
  const setActiveUpscalerModel = (key: ModelKey) => {
    setUpscalerActiveKey(key);
    setUpscalerActiveName(MODELS[key].name);
  };

  /* ----------------------------------------------------------
     MODEL WARMUP (hover-intent preloading)
       Upscaler assets are small enough to warm on intent. The BG
       remover model is large (~192 MB) and loads when its route is
       opened, so a transient hover must not start that download.
       ---------------------------------------------------------- */
  const warmup = useCallback(
    (tab: ViewTab) => {
      try {
        if (tab === 'upscaler') {
          // Idle preload already covers all models - don't double-load.
          if (!sessionRef.current && !modelLoading) {
            void (async () => {
              try {
                await initLiteRT();
                setActiveUpscalerModel('vitality');
                await loadModel('vitality', { silentIfCached: true, background: true });
              } catch { /* silent: click path handles errors */ }
            })();
          }
        }
      } catch { /* silent */ }
    },
    [initLiteRT, loadModel, modelLoading, sessionRef]
  );

  /* ----------------------------------------------------------
     LIVE MODEL DOWNLOAD LIST (navbar badge)
     One row per model currently transferring into the browser
     cache. Empty when everything is available → icon hidden.
     ---------------------------------------------------------- */
  const modelDownloads = useMemo<ModelDownloadItem[]>(() => {
    const out: ModelDownloadItem[] = [];
    // Only real transfers (progress events) surface - runtime init or
    // session-compile of already-cached models must NOT flash the badge.
    if ((modelLoading || modelPrefetching) && modelProgress !== null) {
      out.push({ id: 'upscaler', name: upscalerActiveName, progress: Math.round(modelProgress) });
    }
    // Cached Chopper reports a 100% progress tick - that's not a download;
    // bgDownloadActive goes true only once a real <95% transfer tick lands.
    if (bgModelPhase === 'downloading' && bgDownloadActive) {
      out.push({
        id: 'bg-remove',
        name: bgModelLoadName === 'Diablo' ? 'Diablo · BG remover (premium)' : 'Chopper · BG remover',
        progress: Math.round(bgModelProgress),
      });
    }
    return out;
  }, [modelLoading, modelPrefetching, modelProgress, upscalerActiveName, bgModelPhase, bgModelProgress, bgDownloadActive, bgModelLoadName]);

  /* ----------------------------------------------------------
     ADD UPSCALE FILE (Creates individual UpscaleItem)
     ---------------------------------------------------------- */
  /** Drop the object URLs and decoded bitmap owned by an upscale item. */
  const releaseUpscaleItem = useCallback((item: UpscaleItem) => {
    cancelUpscale(item.id);
    if (item.result?.blobUrl) URL.revokeObjectURL(item.result.blobUrl);
    if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    if (item.img && item.status !== 'processing') {
      item.img.onload = null;
      item.img.onerror = null;
      item.img.src = '';
    }
  }, []);

  const addUpscaleFile = useCallback((file: File, autoProcess = false) => {
    if (file.size > MAX_UPSCALER_FILE_SIZE) {
      addToast('error', 'Selected file exceeds the 15 MB limit.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // Admission is by file size (15 MB above) and source megapixels. 32 MP is
      // the largest source this pipeline accepts; a 15 MB photo can easily be
      // over that, and no amount of compression makes the pixels cheaper.
      if (width * height > MAX_SOURCE_PIXELS) {
        img.onload = null;
        img.onerror = null;
        URL.revokeObjectURL(url);
        img.src = '';
        addToast(
          'error',
          `Image resolution (${formatPixels(width * height)}, ${width}×${height}) exceeds the 32 MP source limit.`
        );
        return;
      }

      // Pick the largest scale this image fits in on this device. 4× turns a
      // 12 MP photo into ~192 MP, which exceeds the tab's memory budget, so
      // fall back to 2× instead of starting a run that is guaranteed to fail
      // (or take the tab down with an OOM).
      const options = { ...DEFAULT_OPTIONS };
      const budget = checkUpscaleBudget(width, height, options.scale);
      if (!budget.ok) {
        if (budget.suggestedScale) {
          options.scale = budget.suggestedScale;
          addToast(
            'info',
            `${width}×${height} at ${DEFAULT_OPTIONS.scale}× exceeds the output limit (${formatPixels(budget.pixels)}). Switched to ${budget.suggestedScale}×.`
          );
        } else {
          img.onload = null;
          img.onerror = null;
          URL.revokeObjectURL(url);
          img.src = '';
          addToast(
            'error',
            `Image (${width}×${height}) exceeds this device's processing capacity. Select a smaller image.`
          );
          return;
        }
      }
      const newItemId = makeId();
      const newItem: UpscaleItem = {
        id: newItemId,
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
        options,
        modelKey: 'vitality',
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedId(newItemId);
      setStep('config');
      setActiveUpscalerModel('vitality');
      if (autoProcess) {
        pendingAutoUpscaleIdRef.current = newItemId;
      }
      void loadModel('vitality', { silentIfCached: true, background:true });
      scrollToTop();
    };
    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      URL.revokeObjectURL(url);
      img.src = '';
      addToast('error', 'Unable to load the selected image.');
    };
    img.src = url;
  }, [addToast, loadModel, scrollToTop]);

  /* ----------------------------------------------------------
     HANDLE MODEL CHANGE (Per image)
     ---------------------------------------------------------- */
  const handleItemModelChange = useCallback(
    async (id: string, key: ModelKey) => {
      const previous = items.find((i) => i.id === id);
      if (previous?.result?.blobUrl) URL.revokeObjectURL(previous.result.blobUrl);
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
      // User picked a model manually - stop racing the background preload
      // and drop its pending badge rows.
      preloadCancelledRef.current = true;
      setUpscalerPreloadQueue([]);
      const ok = await loadModel(key, { silentIfCached: true, background: true });
      if (!ok) {
        addToast('error', `Failed to load ${MODELS[key]?.name || key} model.`);
      }
    },
    [items, loadModel, addToast]
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
     RESET SETTINGS (Per image) - back to the model's default preset
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
      if (!item || item.status === 'processing') return;

      const budget = checkUpscaleBudget(item.width, item.height, item.options.scale);
      if (!budget.ok) {
        addToast(
          'info',
          budget.suggestedScale
            ? `Output at ${item.options.scale}× would be ${formatPixels(budget.pixels)}. Select ${budget.suggestedScale}× to fit this device's limit.`
            : 'This image exceeds the output limit for this device. Select a smaller image.'
        );
        setItems((prev) => prev.map((entry) => entry.id === id
          ? { ...entry, status: 'idle', error: null, progress: { percent: 0, text: '' } }
          : entry));
        return;
      }
      const operationId = window.crypto.randomUUID();
      let lastProgressAt = 0;

      // Prime audio context and ask for browser notification permission on user gesture
      primeAudio();
      requestNotificationPermission().catch(() => { });

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
        if (!sessionRef.current || sessionRef.current?.__modelKey !== item.modelKey) {
          setActiveUpscalerModel(item.modelKey);
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? { ...i, progress: { percent: 8, text: `Loading ${MODELS[item.modelKey].name}...` } }
                : i
            )
          );
          await loadModel(item.modelKey);
        }

        const res = await upscale(
          id,
          item.img,
          item.modelKey,
          item.options,
          (p: ProgressState) => {
            // Progress is decorative: it must never compete with typing, hover
            // or scrolling for the main thread, and it re-renders the whole
            // provider tree. Coalesce bursts and mark the update interruptible.
            const now = performance.now();
            if (p.percent < 100 && now - lastProgressAt < 150) return;
            lastProgressAt = now;
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, progress: p } : i))
            );
          }
        );

        // The new result replaces the old one - release the old object URL.
        if (item.result?.blobUrl && item.result.blobUrl !== res.blobUrl) {
          URL.revokeObjectURL(item.result.blobUrl);
        }

        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                ...i,
                status: 'completed',
                result: res,
                progress: {
                  percent: 100,
                  text: 'Complete!',
                  engine: res.engine,
                  engineFallback: res.engineFallback,
                  engineFallbackReason: res.engineFallbackReason,
                },
              }
              : i
          )
        );
        void awardPoint('upscale', operationId);

        // Play pleasant completion chime & send desktop notification
        playSuccessChime();
        sendDesktopNotification(
          '✨ Image Upscaled!',
          `${item.name} (${item.options.scale}×) is ready.`,
          item.url
        );
        addToast(
          'success',
          `Upscale complete: ${item.name} (${item.options.scale}×, ${(res.time / 1000).toFixed(1)}s).`
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
            ? `Output at ${item.options.scale}× exceeds the limit for this image. Try 2× instead.`
            : 'This image exceeds the supported output limit. Select a smaller image.');
          setItems((prev) => prev.map((entry) => entry.id === id
            ? { ...entry, status: 'idle', error: null, progress: { percent: 0, text: '' } }
            : entry));
          return;
        }
        console.error(`Upscaling failed for ${item.name}:`, err);
        const userMessage = 'Upscaling failed. Try again, or use a smaller image.';
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

  useEffect(() => {
    if (pendingAutoUpscaleIdRef.current) {
      const targetId = pendingAutoUpscaleIdRef.current;
      const targetItem = items.find((i) => i.id === targetId);
      if (targetItem && targetItem.status === 'idle') {
        pendingAutoUpscaleIdRef.current = null;
        void handleUpscaleItem(targetId);
      }
    }
  }, [items, handleUpscaleItem]);

  /* ----------------------------------------------------------
     CANCEL UPSCALE (Per item)
     ---------------------------------------------------------- */
  const handleCancelUpscale = useCallback((id: string) => {
    cancelUpscale(id);
    const item = items.find((i) => i.id === id);
    if (item?.result?.blobUrl) URL.revokeObjectURL(item.result.blobUrl);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
            ...i,
            status: 'idle',
            result: null,
            error: null,
            progress: { percent: 0, text: '' },
          }
          : i
      )
    );
    addToast('info', 'Upscaling cancelled.');
  }, [items, addToast]);

  /* ----------------------------------------------------------
     REMOVE / CLEAR ITEMS
     ---------------------------------------------------------- */
  const handleRemoveItem = useCallback(
    (id: string) => {
      const removed = items.find((i) => i.id === id);
      if (removed) releaseUpscaleItem(removed);
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
    [items, selectedId, releaseUpscaleItem]
  );

  const handleClearAll = useCallback(() => {
    for (const item of items) releaseUpscaleItem(item);
    setItems([]);
    setSelectedId(null);
    setStep('upload');
  }, [items, releaseUpscaleItem]);

  /* ----------------------------------------------------------
     EXIT WORKSPACE (mobile X / desktop close) - back to upload.
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
    async (id: string, format: 'png' | 'webp' | 'jpeg' = 'webp') => {
      const item = items.find((i) => i.id === id);
      const res = item?.result;
      const resultUrl = res?.blobUrl;
      if (!item || !res || !resultUrl) return;
      const baseName = item.name.replace(/\.[^/.]+$/, '');
      const ext = format === 'webp' ? 'webp' : format === 'jpeg' ? 'jpg' : 'png';

      const triggerDownload = (url: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_upscaled_${item.options.scale}x.${ext}`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      };

      if (format === 'png') {
        triggerDownload(resultUrl);
        addToast(
          'success',
          res.bytes ? `Exported PNG (${formatBytes(res.bytes)}).` : 'Exported PNG.'
        );
        return;
      }

      // The stored master is a lossless PNG, which costs roughly one byte per
      // pixel — a 48 MP upscale is ~50 MB. Re-encode photos to WebP/JPEG on
      // download: 6-8x smaller with no visible difference at these qualities.
      try {
        const sourceBlob = await (await fetch(resultUrl)).blob();
        const bitmap = await createImageBitmap(sourceBlob);
        const canvas = document.createElement('canvas');
        canvas.width = res.width;
        canvas.height = res.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context is unavailable.');

        // JPEG has no alpha channel. Flatten onto white so edges that were
        // transparent in the PNG do not turn black.
        if (format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, res.width, res.height);
        }
        ctx.drawImage(bitmap, 0, 0, res.width, res.height);
        bitmap.close?.();

        const mime = format === 'webp' ? 'image/webp' : 'image/jpeg';
        const quality = format === 'webp' ? 0.93 : 0.92;
        const out = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, mime, quality)
        );
        canvas.width = 0;
        canvas.height = 0;
        if (!out) throw new Error('Encoding failed.');

        // Browsers without a WebP encoder silently return a PNG blob. Honour
        // the real type so the file extension never lies about the contents.
        if (out.type !== mime) {
          addToast('info', `${format.toUpperCase()} encoding is unavailable in this browser. Exported PNG instead.`);
          triggerDownload(resultUrl);
          return;
        }

        const url = URL.createObjectURL(out);
        triggerDownload(url);
        // Revoking immediately can cancel the download in some browsers.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        addToast(
          'success',
          `Exported ${ext.toUpperCase()} (${formatBytes(out.size)}).`
        );
      } catch (err) {
        console.warn(`Re-encoding to ${format.toUpperCase()} failed; saving PNG instead.`, err);
        addToast('error', `Unable to export as ${format.toUpperCase()}. Exported PNG instead.`);
        triggerDownload(resultUrl);
      }
    },
    [items, addToast]
  );

  // Global File Picker Handler for BG Remove
  const handleBGFiles = useCallback((fileList: FileList | File[], showToast = true) => {
    const files = Array.from(fileList);
    const valid = files.filter((f) => f.type.startsWith('image/') && f.size <= MAX_BG_FILE_SIZE);
    if (!valid.length) {
      addToast('error', 'Selected files exceed the 20 MB limit.');
      return;
    }
    if (valid.length < files.length) {
      addToast('error', 'Some files exceeded the 20 MB limit and were skipped.');
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
    if (showToast) {
      addToast('success', `Added ${additions.length} image${additions.length === 1 ? '' : 's'} to Cutout Canvas.`);
    }
  }, [addToast, navigateTo]);

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
      addToast('error', 'Unable to load the sample image.');
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pixelify:navigation-start'));
    }
    try {
      const res = await fetch(sampleUrl);
      if (!res.ok) throw new Error('Failed to load sample');
      const blob = await res.blob();
      const rawName = sampleUrl.split('/').pop() || 'sample.jpg';
      const file = new File([blob], rawName, { type: blob.type || 'image/jpeg' });
      if (type === 'upscale') {
        navigateTo('upscaler');
        addUpscaleFile(file, true);
        setTimeout(() => {
          addToast('success', `Added to AI Upscaler: ${rawName}.`);
        }, 350);
      } else {
        navigateTo('bg_remove');
        handleBGFiles([file], false);
        setTimeout(() => {
          addToast('success', `Added to Cutout Canvas: ${rawName}.`);
        }, 350);
      }
    } catch (err) {
      addToast('error', 'Unable to load the sample image.');
      throw err;
    } finally {
      setTimeout(() => {
        isSelectingSampleRef.current = false;
      }, 600);
    }
  }, [addToast, addUpscaleFile, handleBGFiles, navigateTo]);

  const dict = useMemo(() => getDictionary(currentLang), [currentLang]);
  const ms = dict.modelStatus;

  const modelStatus = bgFallbackReason && bgEngine === 'wasm'
    ? (ms?.standardMode ? ms.standardMode.replace('{reason}', bgFallbackReason.slice(0, 110)) : `Standard mode: ${bgFallbackReason.slice(0, 110)}`)
    : bgModelPhase === 'downloading'
      ? (ms?.downloadingBg ? ms.downloadingBg.replace('{pct}', String(Math.round(bgModelProgress))) : `Downloading background-removal model (${Math.round(bgModelProgress)}%)`)
      : bgModelPhase === 'preparing'
        ? (ms?.preparingBg || 'Preparing background-removal model')
        : bgModelPhase === 'detecting'
          ? (ms?.checkingGraphics || 'Checking graphics adapter')
          : bgModelPhase === 'error'
            ? (ms?.bgPreloadFailed || 'Background model preload failed; it will retry when used')
            : (modelLoading || modelPrefetching)
              ? (modelProgress === null
                ? (ms?.preparingUpscaler || 'Preparing upscaler model')
                : (ms?.preparingUpscalerPct ? ms.preparingUpscalerPct.replace('{pct}', String(Math.round(modelProgress))) : `Preparing upscaler model (${Math.round(modelProgress)}%)`))
              : upscalerPreloadError && !execEngine
                ? (ms?.upscalerPreloadFailed || 'Upscaler model preload failed; it will retry when used')
                : bgModelPhase === 'ready' && execEngine
                  ? (ms?.modelsReady || 'Default AI models are ready in this browser')
                  : modelsCleared && execEngine
                    ? (ms?.upscalerReady || 'Upscaler model ready; other models load when used')
                    : modelsCleared
                      ? (ms?.modelsCleared || 'Models cleared; they will download again when needed')
                      : (ms?.preparingBackground || 'Preparing AI models in the background');
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

  const value = useMemo<AppContextValue>(() => ({
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
    isMobileSidebarOpen: isMobileNavOpen,
    mobileHidden,
    isOnline,
    currentLang,
    setCurrentLang,
  }), [
    activeTab, navigateTo, warmup, modelDownloads, addToast, openPicker,
    bgJobs, bgEngine, setBgJobs, setBgEngine, setBgWebgpuAvailable,
    handleBGFiles, loadBgSample, handleSelectSample,
    step, items, selectedId, setSelectedId, addUpscaleFile,
    modelLoading, modelProgress, execEngine,
    handleItemModelChange, handleItemOptionsChange, handleResetItemSettings,
    handleUpscaleItem, handleCancelUpscale, handleDownloadItem,
    handleRemoveItem, handleClearAll, handleExitWorkspace,
    webgpuAvailable, modelStatus, isClearingModelCache, canClearModelCache,
    handleClearModelCache, onOpenMobileSidebar, mobileHidden,
    isOnline, isOfflineBannerOpen, justReconnected, setIsOfflineBannerOpen,
    currentLang, setCurrentLang,
  ]);

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

        {/* STICKY NAVBAR - hides on mobile while the upscaler workspace owns the screen, and hidden on docs/overview routes */}
        {!(pathname === '/docs' || pathname?.startsWith('/docs/') || pathname === '/overview' || pathname?.startsWith('/overview/') || /^\/[a-z]{2}\/(docs|overview)(\/|$)/.test(pathname || '')) && (
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
            isMobileSidebarOpen={isMobileNavOpen}
            mobileHidden={mobileHidden}
            isOnline={isOnline}
            justReconnected={justReconnected}
          />
        )}

        {/* MOBILE NAVIGATION SIDEBAR (replaces the old bottom nav on < md) */}
        {!(pathname === '/docs' || pathname?.startsWith('/docs/') || pathname === '/overview' || pathname?.startsWith('/overview/') || /^\/[a-z]{2}\/(docs|overview)(\/|$)/.test(pathname || '')) && (
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
            isOnline={isOnline}
          />
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 w-full mx-auto transition-all duration-300 w-full max-w-none p-0">
          {children}
        </main>

        {/* SCROLL TO TOP - Only for browsing pages (Home, Blogs), STOPPED on editing workspaces where it blocks design features */}
        {activeTab !== 'bg_remove' && (activeTab !== 'upscaler' || step === 'upload') && (
          <ScrollToTopButton />
        )}

        {/* COOKIE NOTICE (bottom sheet, until "Done") */}
        <CookieNotice />

        {/* OFFLINE / RECONNECTED NOTIFICATION BANNER */}
        <OfflineNoticeBanner
          isOnline={isOnline}
          justReconnected={justReconnected}
          isOpen={isOfflineBannerOpen}
          onDismiss={() => setIsOfflineBannerOpen(false)}
        />
      </div>
    </AppContext.Provider>
  );
}
