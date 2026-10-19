import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileSidebar from './components/MobileSidebar';
import BGRemoveWorkspace from './components/BGRemoveWorkspace';
import UploadArea from './components/UploadArea';
// ImageComparison and ControlPanel replaced by UpscaleWorkspace
import HomePage from './components/HomePage';
// ProcessingOverlay and StatsBar are no longer used here
import UpscaleWorkspace from './components/UpscaleWorkspace';

import UpscaleShowcase from './components/upscaler/UpscaleShowcase';
import UpscaleShowreel from './components/upscaler/UpscaleShowreel';
import UpscaleCapabilities from './components/upscaler/UpscaleCapabilities';
import UpscaleJourney from './components/upscaler/UpscaleJourney';
import UpscaleFaq from './components/upscaler/UpscaleFaq';

import { BgSampleGallery, BgShowcase, BgPipeline, BgPrecision, BgFaq } from './components/bgremove/BgSections';

import Footer from './components/Footer';

import { useONNX } from './hooks/useONNX';
import { useUpscale, cancelUpscale } from './hooks/useUpscale';
import { makeId } from './lib/bgUtils';
import { bgRemoverService } from './bgRemoverService';
import { clearDownloadedModelCaches, requestPersistentModelStorage, subscribeToModelCacheCleared } from './utils/modelCache';
import { buildPresetOptions, getDefaultPreset, MAX_OUTPUT_DIM } from './constants';

import Bgmarquee from './components/bgremove/Bgmarquee';

import TruckBg from './components/TruckBg';

import {
  playSuccessChime,
  primeAudio,
  requestNotificationPermission,
  sendDesktopNotification,
} from './utils/notifications';

import PixelifyStory from './components/PixelifyStory';
import { MODELS } from './constants';

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
} from './types';
import NotFound from './components/NotFound';
import BlogList from './components/blogs/BlogList';
import BlogPost from './components/blogs/BlogPost';
import AboutPage from './components/pages/AboutPage';
import ProductsPage from './components/pages/ProductsPage';
import PrivacyPage from './components/pages/PrivacyPage';
import TermsPage from './components/pages/TermsPage';
import DeviceRecommendationNotice from './components/DeviceRecommendationNotice';
import ScrollToTopButton from './components/ScrollToTopButton';

const STORAGE_KEY = 'pixelify_upscaler_history_2026'; // legacy, no longer written
const THEME_KEY = 'pixelify_theme_pref';
const MAX_UPSCALER_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_BG_FILE_SIZE = 20 * 1024 * 1024;       // 20 MB

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = useCallback((): ViewTab => {
    const path = location.pathname.replace(/^\//, '');
    if (path === 'upscaler' || path === 'bg_remove') {
      return path as ViewTab;
    }
    if (path === 'blogs' || path.startsWith('blogs/')) {
      return 'blogs' as ViewTab;
    }
    return 'home';
  }, [location.pathname]);

  const activeTab = getActiveTab();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Mobile navigation sidebar (replaces the old bottom nav bar on < md)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Theme state management
  const [theme, setTheme] = useState<ThemeMode>(() => {
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

  // Sync state with URL navigation via React Router & force top scroll
  const navigateTo = useCallback(
    (tab: ViewTab) => {
      const targetPath = tab === 'home' ? '/' : `/${tab}`;
      scrollToTop();
      navigate(targetPath);
      scrollToTop();
    },
    [navigate, scrollToTop]
  );

  // Automatically scroll to top whenever route changes (Home <-> BG <-> Upscaler, etc.)
  useEffect(() => {
    scrollToTop();
  }, [location.pathname, scrollToTop]);

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
  // Upscaler: read back from the ONNX session's execution providers.
  // BG remover: reported by the worker hosting the Chopper pipeline.
  const [bgEngine, setBgEngine] = useState<'wasm' | 'webgpu' | null>(null);
  const [bgWebgpuAvailable, setBgWebgpuAvailable] = useState<boolean>(false);
  const [webgpuAvailable, setWebgpuAvailable] = useState<boolean | null>(null);
  const [bgModelPhase, setBgModelPhase] = useState<'idle' | 'detecting' | 'downloading' | 'preparing' | 'ready' | 'error'>('idle');
  const [bgModelProgress, setBgModelProgress] = useState(0);
  const [bgFallbackReason, setBgFallbackReason] = useState<string | null>(null);
  const [upscalerPreloadError, setUpscalerPreloadError] = useState(false);
  const [modelsCleared, setModelsCleared] = useState(false);
  const [isClearingModelCache, setIsClearingModelCache] = useState(false);
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

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
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
        await initONNX();
        if (cancelled || preloadCancelledRef.current) return;
        const loaded = await loadModel('vitality');
        if (!cancelled) setUpscalerPreloadError(!loaded);
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
      setModelsCleared(true);
      addToast('success', 'Downloaded AI models cleared from this browser.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Could not clear downloaded models.');
    } finally {
      setIsClearingModelCache(false);
    }
  }, [addToast, isClearingModelCache, unloadModel]);

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
      loadModel('vitality');
      scrollToTop();
    };
    img.onerror = () => {
      addToast('error', 'Failed to load image file.');
    };
    img.src = url;
  }, [addToast, loadModel, scrollToTop]);

  /* ----------------------------------------------------------
     HANDLE MODEL CHANGE (Per image)
     Switching models also switches to that model's default preset
     so the enhancement sliders always match the selected model.
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
      const ok = await loadModel(key);
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
     CANCEL UPSCALE (Per image) — aborts the in-flight inference run
     and returns the item to its idle state.
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
  }, [cancelUpscale, addToast]);

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
  // (where the dropzone is). Mobile browsers otherwise restore the
  // deep scroll position (footer) that was active before the
  // full-screen workspace opened. Double rAF so it wins over the
  // browser's own scroll restoration after the view re-mounts.
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

  return (
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

      {/* STICKY GLASSMORPHIC NAVBAR (REQUIRED TASK 1 & 5)
          On mobile the upscaler workspace owns the whole screen,
          so the navbar hides there (< lg) and the workspace renders
          its own top bar with the sidebar menu + cancel buttons. */}
      <Navbar
        activeTab={activeTab}
        onTabChange={navigateTo}
        upscalerEngine={execEngine}
        bgEngine={bgEngine}
        webgpuAvailable={webgpuAvailable ?? (bgWebgpuAvailable ? true : null)}
        modelStatus={modelStatus}
        isClearingModelCache={isClearingModelCache}
        canClearModelCache={canClearModelCache}
        onClearModelCache={handleClearModelCache}
        onOpenMobileSidebar={() => setIsMobileNavOpen(true)}
        mobileHidden={activeTab === 'upscaler' && step !== 'upload'}
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
        <Routes>
          {/* ROUTE 1: HOME PAGE (/) */}

          <Route
            path="/"
            element={
              <HomePage
                onLaunchUpscaler={() => navigateTo('upscaler')}
                onLaunchBGRemove={() => navigateTo('bg_remove')}
                onSelectSample={async (sampleUrl, type) => {
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
                }}
                onTabChange={navigateTo}
              />
            }
          />


          {/* ROUTE 1 (alt): BLOG LIST (/blogs) */}
          <Route
            path="/blogs"
            element={
              <BlogList onTabChange={navigateTo} />
            }
          />

          {/* ROUTE 2 (alt): BLOG ARTICLE (/blogs/:slug = English) */}
          <Route
            path="/blogs/:slug"
            element={
              <BlogPost onTabChange={navigateTo} />
            }
          />

          {/* ROUTE 2 (b): TRANSLATED ARTICLE (/blogs/fr/:slug, /blogs/zh/:slug, …) */}
          <Route
            path="/blogs/:lang/:slug"
            element={
              <BlogPost onTabChange={navigateTo} />
            }
          />

          {/* STATIC PAGES: ABOUT / PRODUCTS / PRIVACY / TERMS */}
          <Route path="/about" element={<AboutPage onTabChange={navigateTo} />} />
          <Route path="/products" element={<ProductsPage onTabChange={navigateTo} />} />
          <Route path="/privacy" element={<PrivacyPage onTabChange={navigateTo} />} />
          <Route path="/terms" element={<TermsPage onTabChange={navigateTo} />} />

          {/* ROUTE 3: AI UPSCALER STUDIO (/upscaler) */}
          <Route
            path="/upscaler"
            element={
              <div className="flex flex-col gap-8 w-full px-2">

                <DeviceRecommendationNotice tool="upscale" />

                {step === 'upload' && (
                  <UploadArea
                    onFile={addUpscaleFile}
                    isLoading={items.some((i) => i.status === 'processing')}
                    fileName={items[0]?.name}
                    fileSize={items[0]?.size}
                    onClear={handleClearAll}
                    beforeImage="/upscaler/shoes.jpeg"
                    afterImage="/upscaler/shoes.png"
                    maxSizeMB={15}
                  />
                )}

                {step === 'upload' && (
                  <>
                    <UpscaleShowcase />
                    <UpscaleShowreel />
                    <UpscaleCapabilities />
                    <UpscaleJourney />
                    <UpscaleFaq />
                  </>
                )}

                {step !== 'upload' && (
                  <UpscaleWorkspace
                    items={items}
                    selectedId={selectedId || (items[0]?.id ?? '')}
                    onSelectId={setSelectedId}
                    onRemoveId={handleRemoveItem}
                    onAddFile={addUpscaleFile}
                    isLoading={modelLoading}
                    modelProgress={modelProgress}
                    onModelChange={handleItemModelChange}
                    onOptionsChange={handleItemOptionsChange}
                    onResetSettings={handleResetItemSettings}
                    onUpscale={handleUpscaleItem}
                    onCancel={handleCancelUpscale}
                    onDownload={handleDownloadItem}
                    onReset={handleClearAll}
                    onOpenMobileSidebar={() => setIsMobileNavOpen(true)}
                    onExitWorkspace={handleExitWorkspace}
                  />
                )}

                <Footer onTabChange={navigateTo} />
              </div>
            }
          />
          <Route
            path="/bg_remove"
            element={
              <div className="w-full flex flex-col gap-8">
                <BGRemoveWorkspace
                  jobs={bgJobs}
                  setJobs={setBgJobs}
                  addToast={addToast}
                  onFileAdd={handleBGFiles}
                  onOpenPicker={() => fileInputRef.current?.click()}
                  onEngineReport={(engine, webgpuAvailable) => {
                    setBgEngine(engine);
                    setBgWebgpuAvailable(webgpuAvailable);
                  }}
                />
                {bgJobs.length === 0 && (
                  <>
                    <BgShowcase />
                    <Bgmarquee />
                    <BgPipeline />
                    <BgPrecision />
                    <BgSampleGallery onLoadSample={loadBgSample} />
                    <BgFaq />
                  </>
                )}
                <Footer onTabChange={navigateTo} />
              </div>
            }
          />

          <Route path="/story" element={
            <PixelifyStory />
          } />

          <Route path="truckbg" element={
            <TruckBg />
          }>
          </Route>

          {/* FALLBACK ROUTE: Redirect to / */}
          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/404" element={<NotFound />} />

        </Routes>
      </main>

      {(activeTab === 'home' || activeTab === 'bg_remove' || activeTab === 'upscaler') && (
        <ScrollToTopButton />
      )}
    </div>
  );
}
