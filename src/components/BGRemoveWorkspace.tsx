import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Image as ImageIcon, Sparkles, SlidersHorizontal, PanelsTopLeft, Columns2, Undo2, Redo2, Download as DownloadIcon, ChevronDown, ZoomIn, ZoomOut, RotateCcw, RotateCw, Crop as CropIcon, Plus, FlipHorizontal, FlipVertical, Check, X } from 'lucide-react';
import UploadArea from './UploadArea';
import BGComparator, { ImageAdjustments, ImageEffects } from './BGComparator';
import type { FabricEditMode, FabricCropRatio, FabricImageEditorHandle, SubjectTransform } from './bgremove/FabricImageEditor';
import { DEFAULT_SUBJECT_TRANSFORM } from './bgremove/FabricImageEditor';
import { makeId, downloadName } from '../lib/bgUtils';
import { bgRemoverService } from '../bgRemoverService';
import type { BGJob } from '../types';
import {
  TextLayer,
  ElementLayer,
  ElementPreset,
  FONT_FAMILIES,
  COLOR_PALETTE,
  ELEMENT_PRESETS,
  renderDesignLayersToCanvas,
} from './bgremove/DesignAssets';
import DeviceRecommendationNotice from './DeviceRecommendationNotice';

interface BGRemoveWorkspaceProps {
  jobs: BGJob[];
  setJobs: React.Dispatch<React.SetStateAction<BGJob[]>>;
  addToast: (type: 'success' | 'error' | 'info', text: string) => void;
  onOpenPicker: () => void;
  onFileAdd?: (files: FileList | File[]) => void;
  /** Live engine reported by the processing worker ('wasm' | 'webgpu') */
  onEngineReport?: (engine: 'wasm' | 'webgpu', webgpuAvailable: boolean) => void;
}

type TabType = 'cutout' | 'background' | 'effects' | 'adjust' | 'design';
type BgSubTab = 'photo' | 'color';
type DesignSubTab = 'text' | 'elements' | 'layers';
type CropRatio = FabricCropRatio;

const COLOR_PRESETS = [
  { id: 'transparent', label: 'Transparent', style: 'bg-[repeating-conic-gradient(#26282e_0%_25%,#1b1d22_0%_50%)] [background-size:20px_20px]', fill: null },
  { id: 'white', label: 'White', style: '', fill: '#ffffff' },
  { id: 'dark', label: 'Midnight', style: '', fill: '#09090D' },
  { id: 'mint', label: 'Mint Studio', style: '', fill: '#00FF85' },
  { id: 'blue', label: 'Sky Blue', style: '', fill: '#38bdf8' },
  { id: 'pink', label: 'Pastel Pink', style: '', fill: '#f9a8d4' },
  { id: 'sunset', label: 'Coral', style: '', fill: '#fb7185' },
  { id: 'slate', label: 'Dark Slate', style: '', fill: '#64748b' },
];

interface EditorSnapshot {
  selectedBg: (typeof COLOR_PRESETS)[number];
  customBgColor?: string;
  customBgImage?: string;
  subjectBgBlur: number;
  bgBlur: number;
  bgDarken: number;
  adjustments: ImageAdjustments;
  effects: ImageEffects;
  rotation: number;
  cropRatio: CropRatio;
  textLayers: TextLayer[];
  elementLayers: ElementLayer[];
  selectedLayerId: string | null;
  selectedJobId: string | null;
  resultBlob: Blob | null;
  subjectTransform?: SubjectTransform;
}

const PHOTO_PRESETS = [
  { id: 'stock-1', label: 'Stock 1', url: '/bgremove/stock/1.jpg' },
  { id: 'stock-2', label: 'Stock 2', url: '/bgremove/stock/2.jpg' },
  { id: 'stock-3', label: 'Stock 3', url: '/bgremove/stock/3.jpg' },
  { id: 'stock-4', label: 'Stock 4', url: '/bgremove/stock/4.jpg' },
  { id: 'stock-5', label: 'Stock 5', url: '/bgremove/stock/5.jpg' },
  { id: 'stock-6', label: 'Stock 6', url: '/bgremove/stock/6.jpg' },
  { id: 'stock-7', label: 'Stock 7', url: '/bgremove/stock/7.jpg' },
  { id: 'stock-8', label: 'Stock 8', url: '/bgremove/stock/8.jpg' },
  { id: 'stock-9', label: 'Stock 9', url: '/bgremove/stock/9.jpg' },
  { id: 'stock-10', label: 'Stock 10', url: '/bgremove/stock/10.jpg' },
  { id: 'stock-11', label: 'Stock 11', url: '/bgremove/stock/11.jpg' },
  { id: 'stock-12', label: 'Stock 12', url: '/bgremove/stock/12.jpg' },
  { id: 'stock-13', label: 'Stock 13', url: '/bgremove/stock/13.jpg' },
  { id: 'stock-14', label: 'Stock 14', url: '/bgremove/stock/14.jpg' },
  { id: 'stock-15', label: 'Stock 15', url: '/bgremove/stock/15.jpg' },
  { id: 'stock-16', label: 'Stock 16', url: '/bgremove/stock/16.jpg' },
  { id: 'stock-17', label: 'Stock 17', url: '/bgremove/stock/17.jpg' },
  { id: 'stock-18', label: 'Stock 18', url: '/bgremove/stock/18.jpg' },
  { id: 'stock-19', label: 'Stock 19', url: '/bgremove/stock/19.jpg' },
  { id: 'stock-20', label: 'Stock 20', url: '/bgremove/stock/20.jpg' },
];

export default function BGRemoveWorkspace({
  jobs,
  setJobs,
  addToast,
  onOpenPicker,
  onFileAdd,
  onEngineReport,
}: BGRemoveWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(jobs[0]?.id || null);
  const [activeTab, setActiveTab] = useState<TabType>('cutout');
  const [bgSubTab, setBgSubTab] = useState<BgSubTab>('photo');
  const [designSubTab, setDesignSubTab] = useState<DesignSubTab>('text');
  const [elementCategory, setElementCategory] = useState<'all' | 'badges' | 'shapes' | 'stickers'>('all');

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [viewportZoom, setViewportZoom] = useState(1);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'webp' | 'jpeg'>('png');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);

  // Cutout & edit options
  const [cutoutTool, setCutoutTool] = useState<'erase' | 'restore' | 'move'>('move');
  const [brushSize, setBrushSize] = useState(40);
  const [canUndoEditor, setCanUndoEditor] = useState(false);
  const [canRedoEditor, setCanRedoEditor] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [cropRatio, setCropRatio] = useState<CropRatio>('free');
  const [fabricEditMode, setFabricEditMode] = useState<FabricEditMode | null>(null);
  const [fabricCropRatioDraft, setFabricCropRatioDraft] = useState<CropRatio>('free');
  const [cropRotationDraft, setCropRotationDraft] = useState(0);
  const [cropTarget, setCropTarget] = useState<'frame' | 'image'>('frame');
  const [cropZoom, setCropZoom] = useState(100);
  const [subjectTransform, setSubjectTransform] = useState<SubjectTransform>(DEFAULT_SUBJECT_TRANSFORM);
  const fabricEditorRef = useRef<FabricImageEditorHandle | null>(null);
  const savedTransformBeforeEditRef = useRef<SubjectTransform>(DEFAULT_SUBJECT_TRANSFORM);
  const editorHistoryRef = useRef<{ past: EditorSnapshot[]; future: EditorSnapshot[] }>({ past: [], future: [] });

  useEffect(() => {
    setSubjectTransform(DEFAULT_SUBJECT_TRANSFORM);
    setViewportZoom(1);
  }, [selectedId]);

  // Background options
  const [selectedBg, setSelectedBg] = useState(COLOR_PRESETS[0]);
  const [customBgColor, setCustomBgColor] = useState<string | undefined>(undefined);
  const [customBgImage, setCustomBgImage] = useState<string | undefined>(undefined);
  const [subjectBgBlur, setSubjectBgBlur] = useState(0);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgDarken, setBgDarken] = useState(0);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  // Image adjustments & effects
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
  });

  const [effects, setEffects] = useState<ImageEffects>({
    shadow: false,
    shadowBlur: 16,
    shadowOffsetY: 14,
    shadowOpacity: 50,
    shadowColor: '#000000',
    stroke: false,
    strokeColor: '#00FF85',
    strokeWidth: 4,
    glow: false,
    glowColor: '#00FF85',
  });

  // Design layers (Text and Vector Elements)
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [elementLayers, setElementLayers] = useState<ElementLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const strokeColorInputRef = useRef<HTMLInputElement>(null);

  const handleOpenStrokeColorPicker = (e?: React.MouseEvent) => {
    if (strokeColorInputRef.current) {
      if (typeof strokeColorInputRef.current.showPicker === 'function') {
        try {
          strokeColorInputRef.current.showPicker();
          e?.preventDefault();
          return;
        } catch {
          // Native click fallback
        }
      }
      strokeColorInputRef.current.click();
    }
  };


  // Subscribe to the app-wide worker; App starts its preload on the first visit.
  useEffect(() => {
    const unsubscribe = bgRemoverService.subscribeEngine((engine, webgpuAvailable) => {
      onEngineReport?.(engine, webgpuAvailable);
    });
    void bgRemoverService.init();
    return unsubscribe;
  }, [onEngineReport]);

  const selected = jobs.find((job) => job.id === selectedId) ?? jobs[0];

  useEffect(() => {
    if (!downloadMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!downloadMenuRef.current?.contains(event.target as Node)) setDownloadMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDownloadMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [downloadMenuOpen]);

  // Reset stage settings when switching images
  useEffect(() => {
    setSelectedBg(COLOR_PRESETS[0]);
    setCustomBgColor(undefined);
    setCustomBgImage(undefined);
    setSubjectBgBlur(0);
    setBgBlur(0);
    setBgDarken(0);
    setRotation(0);
    setCropRatio('free');
    setCutoutTool('move');
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });
    setEffects({
      shadow: false,
      shadowBlur: 16,
      shadowOffsetY: 14,
      shadowOpacity: 50,
      shadowColor: '#000000',
      stroke: false,
      strokeColor: '#00FF85',
      strokeWidth: 4,
      glow: false,
      glowColor: '#00FF85',
    });
    setTextLayers([]);
    setElementLayers([]);
    setSelectedLayerId(null);
    editorHistoryRef.current = { past: [], future: [] };
    setCanUndoEditor(false);
    setCanRedoEditor(false);
  }, [selectedId]);

  const updateJob = (id: string, changes: Partial<BGJob>) => {
    setJobs((items) => items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  async function processJob(job: BGJob) {
    const serviceState = bgRemoverService.getState();
    const isModelReady = serviceState.isReady;

    let currentProgress = isModelReady ? 15 : 5;
    let currentMessage = isModelReady
      ? 'Analyzing image pixels...'
      : 'Loading AI vision model weights...';

    updateJob(job.id, {
      status: isModelReady ? 'processing' : 'loading',
      progress: currentProgress,
      message: currentMessage,
    });

    let tickerInterval: ReturnType<typeof setInterval> | null = null;
    const startTicker = (startPct: number, targetPct = 92) => {
      if (tickerInterval) clearInterval(tickerInterval);
      currentProgress = Math.max(currentProgress, startPct);
      tickerInterval = setInterval(() => {
        if (currentProgress < targetPct) {
          const remaining = targetPct - currentProgress;
          const step = Math.max(1, Math.round(remaining * 0.12));
          currentProgress = Math.min(targetPct, currentProgress + step);

          let stageMsg = currentMessage;
          if (currentProgress >= 25 && currentProgress < 50) {
            stageMsg = 'Detecting subject contours & lighting...';
          } else if (currentProgress >= 50 && currentProgress < 78) {
            stageMsg = 'Extracting clean subject cutout...';
          } else if (currentProgress >= 78) {
            stageMsg = 'Refining transparent edge detail...';
          }
          currentMessage = stageMsg;

          updateJob(job.id, {
            status: 'processing',
            progress: currentProgress,
            message: currentMessage,
          });
        }
      }, 110);
    };

    if (isModelReady) {
      startTicker(15, 92);
    }

    try {
      const { blob, elapsedMs } = await bgRemoverService.removeBackground(
        job.id,
        job.sourceUrl,
        (pct, isWeights) => {
          if (isWeights || pct > 0) {
            const mapped = Math.min(60, Math.max(5, Math.round(5 + pct * 0.55)));
            currentProgress = Math.max(currentProgress, mapped);
            currentMessage = `Downloading AI vision model (${pct}%)...`;
            updateJob(job.id, {
              status: 'loading',
              progress: currentProgress,
              message: currentMessage,
            });
            if (pct >= 100) {
              startTicker(65, 92);
            }
          }
        },
        (stage, msg) => {
          if (stage === 'running-inference') {
            startTicker(Math.max(currentProgress, 40), 92);
          } else if (stage === 'encoding-output') {
            if (tickerInterval) clearInterval(tickerInterval);
            currentProgress = Math.max(currentProgress, 94);
            currentMessage = msg || 'Encoding transparent PNG...';
            updateJob(job.id, {
              status: 'processing',
              progress: currentProgress,
              message: currentMessage,
            });
          }
        }
      );

      if (tickerInterval) clearInterval(tickerInterval);

      updateJob(job.id, {
        status: 'processing',
        progress: 98,
        message: 'Finalizing cutout...',
      });
      await new Promise((r) => setTimeout(r, 140));

      updateJob(job.id, {
        status: 'processing',
        progress: 100,
        message: 'Cutout complete!',
      });
      await new Promise((r) => setTimeout(r, 220));

      const url = URL.createObjectURL(blob);

      updateJob(job.id, {
        status: 'done',
        progress: 100,
        message: 'Complete',
        resultUrl: url,
        resultBlob: blob,
        elapsedMs,
      });

      addToast('success', `${job.name} background removed!`);
    } catch (err: any) {
      if (tickerInterval) clearInterval(tickerInterval);
      console.error('processJob failed:', err);
      const rawMessage = String(err?.message || '');
      const userMessage = /webgpu|onnxruntime|ortRun|buffer|adapter|device lost/i.test(rawMessage)
        ? 'Background removal hit a graphics-processing error. Please retry; if it happens again, reload the page and try once more.'
        : 'Could not remove this background. Please try another image or retry.';
      updateJob(job.id, {
        status: 'error',
        message: userMessage,
      });
      addToast('error', userMessage);
    }
  }

  // Automatic background removal on upload
  useEffect(() => {
    const readyJob = jobs.find((job) => job.status === 'ready');
    if (readyJob) {
      setSelectedId(readyJob.id);
      processJob(readyJob);
    }
  }, [jobs]);

  function removeJob(id: string) {
    setJobs((items) => {
      const found = items.find((item) => item.id === id);
      if (found) {
        URL.revokeObjectURL(found.sourceUrl);
        if (found.resultUrl) URL.revokeObjectURL(found.resultUrl);
      }
      return items.filter((item) => item.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
    addToast('info', 'Image removed from workspace.');
  }

  // Save manual brush modifications
  async function handleBrushStroke(newBlob: Blob, newUrl: string) {
    if (!selected) return;
    recordEditorEdit();
    const oldUrl = selected.resultUrl;
    updateJob(selected.id, { resultBlob: newBlob, resultUrl: newUrl });

    if (oldUrl && oldUrl !== selected.sourceUrl) {
      URL.revokeObjectURL(oldUrl);
    }
  }

  // -------------------------------------------------------------
  // DESIGN LAYERS: TEXT & ELEMENTS HELPERS
  // -------------------------------------------------------------
  function addCustomText(title = 'Add Your Text Here', fontSize = 36) {
    recordEditorEdit();
    const newLayer: TextLayer = {
      id: `text-${makeId()}`,
      text: title,
      x: 50,
      y: 40 + textLayers.length * 6,
      fontSize,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'bold',
      color: '#FFFFFF',
      align: 'center',
      bgPill: 'black',
      shadow: true,
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    addToast('success', 'Custom text added to canvas');
  }

  function addElementPreset(preset: ElementPreset) {
    recordEditorEdit();
    const newLayer: ElementLayer = {
      id: `el-${makeId()}`,
      type: preset.type,
      name: preset.name,
      key: preset.key,
      x: 50,
      y: 65,
      size: preset.defaultSize,
      color: preset.defaultColor,
      rotation: 0,
      opacity: 1,
      badgeText: preset.badgeText,
    };
    setElementLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    addToast('success', `Added element: ${preset.name}`);
  }

  function updateTextLayer(id: string, changes: Partial<TextLayer>) {
    recordEditorEdit();
    setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...changes } : l)));
  }

  function updateElementLayer(id: string, changes: Partial<ElementLayer>) {
    recordEditorEdit();
    setElementLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...changes } : l)));
  }

  function deleteLayer(id: string) {
    recordEditorEdit();
    setTextLayers((prev) => prev.filter((l) => l.id !== id));
    setElementLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }

  const selectedTextLayer = textLayers.find((l) => l.id === selectedLayerId);
  const selectedElementLayer = elementLayers.find((l) => l.id === selectedLayerId);

  function captureEditorSnapshot(): EditorSnapshot {
    return {
      selectedBg,
      customBgColor,
      customBgImage,
      subjectBgBlur,
      bgBlur,
      bgDarken,
      adjustments,
      effects,
      rotation,
      cropRatio,
      textLayers,
      elementLayers,
      selectedLayerId,
      selectedJobId: selected?.id || null,
      resultBlob: selected?.resultBlob || null,
      subjectTransform,
    };
  }

  function updateEditorHistoryAvailability() {
    setCanUndoEditor(editorHistoryRef.current.past.length > 0);
    setCanRedoEditor(editorHistoryRef.current.future.length > 0);
  }

  function recordEditorEdit() {
    editorHistoryRef.current.past.push(captureEditorSnapshot());
    if (editorHistoryRef.current.past.length > 50) editorHistoryRef.current.past.shift();
    editorHistoryRef.current.future = [];
    updateEditorHistoryAvailability();
  }

  function restoreEditorSnapshot(snapshot: EditorSnapshot) {
    setSelectedBg(snapshot.selectedBg);
    setCustomBgColor(snapshot.customBgColor);
    setCustomBgImage(snapshot.customBgImage);
    setSubjectBgBlur(snapshot.subjectBgBlur);
    setBgBlur(snapshot.bgBlur);
    setBgDarken(snapshot.bgDarken);
    setAdjustments(snapshot.adjustments);
    setEffects(snapshot.effects);
    setRotation(snapshot.rotation);
    setCropRatio(snapshot.cropRatio);
    setTextLayers(snapshot.textLayers);
    setElementLayers(snapshot.elementLayers);
    setSelectedLayerId(snapshot.selectedLayerId);
    if (snapshot.subjectTransform) setSubjectTransform(snapshot.subjectTransform);
    if (snapshot.selectedJobId && snapshot.resultBlob) {
      updateJob(snapshot.selectedJobId, {
        resultBlob: snapshot.resultBlob,
        resultUrl: URL.createObjectURL(snapshot.resultBlob),
        status: 'done',
      });
    }
  }

  function undoEditorEdit() {
    const snapshot = editorHistoryRef.current.past.pop();
    if (!snapshot) return;
    editorHistoryRef.current.future.push(captureEditorSnapshot());
    restoreEditorSnapshot(snapshot);
    updateEditorHistoryAvailability();
  }

  function redoEditorEdit() {
    const snapshot = editorHistoryRef.current.future.pop();
    if (!snapshot) return;
    editorHistoryRef.current.past.push(captureEditorSnapshot());
    restoreEditorSnapshot(snapshot);
    updateEditorHistoryAvailability();
  }

  function handleFabricEditApply(blob: Blob) {
    const url = URL.createObjectURL(blob);
    void handleBrushStroke(blob, url);
    setRotation(0);
    setCropRotationDraft(0);
    setCropRatio('free');
    setFabricCropRatioDraft('free');
    setSubjectTransform(DEFAULT_SUBJECT_TRANSFORM);
    setFabricEditMode('transform');
  }

  function handleFabricSidebarApply() {
    if (fabricEditorRef.current) {
      fabricEditorRef.current.apply();
    }
  }

  function handleFabricSidebarCancel() {
    if (fabricEditorRef.current) {
      fabricEditorRef.current.cancel();
    }
    if (fabricEditMode === 'transform') {
      setSubjectTransform(savedTransformBeforeEditRef.current);
      setRotation(savedTransformBeforeEditRef.current.rotation || 0);
    }
    setCropRotationDraft(0);
    fabricEditorRef.current?.setRotation(0);
    setFabricCropRatioDraft(cropRatio);
    const wasCrop = fabricEditMode === 'crop';
    setFabricEditMode(null);
    addToast('info', wasCrop ? 'Crop cancelled' : 'Transform cancelled');
  }

  // -------------------------------------------------------------
  // HIGH-RESOLUTION COMPOSITE EXPORT (BACKGROUND + CUTOUT + DESIGN)
  // -------------------------------------------------------------
  async function download(job: BGJob, format: 'png' | 'webp' | 'jpeg' = 'png') {
    if (!job?.resultUrl) return;
    setIsDownloading(true);
    addToast('info', 'Rendering full composite artwork...');

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      const cutoutImg = new Image();
      cutoutImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        cutoutImg.onload = () => resolve();
        cutoutImg.onerror = () => reject(new Error('Failed to load cutout image'));
        cutoutImg.src = job.resultUrl!;
      });

      // 1. Determine Artboard Dimensions (Option 2: Native Resolution, Zero Clipping)
      let bgImg: HTMLImageElement | null = null;
      if (customBgImage) {
        bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          bgImg!.onload = () => resolve();
          bgImg!.onerror = () => {
            bgImg = null;
            resolve();
          };
          bgImg!.src = customBgImage;
        });
      }

      let exportWidth = cutoutImg.width;
      let exportHeight = cutoutImg.height;

      if (bgImg && bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0) {
        exportWidth = bgImg.naturalWidth;
        exportHeight = bgImg.naturalHeight;
      } else if (cropRatio !== 'free') {
        const [rw, rh] = cropRatio.split(':').map(Number);
        if (rw && rh) {
          const targetRatio = rw / rh;
          if (cutoutImg.width / cutoutImg.height > targetRatio) {
            exportHeight = cutoutImg.naturalHeight;
            exportWidth = Math.round(exportHeight * targetRatio);
          } else {
            exportWidth = cutoutImg.naturalWidth;
            exportHeight = Math.round(exportWidth / targetRatio);
          }
        }
      }

      canvas.width = exportWidth;
      canvas.height = exportHeight;

      let sourceImg: HTMLImageElement | null = null;
      if (subjectBgBlur > 0) {
        sourceImg = new Image();
        sourceImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          sourceImg!.onload = () => resolve();
          sourceImg!.onerror = () => resolve();
          sourceImg!.src = job.sourceUrl;
        });
      }

      // 1. Draw Background Layer
      if (bgImg) {
        ctx.save();
        if (bgBlur > 0) ctx.filter = `blur(${bgBlur * 2}px)`;
        ctx.drawImage(bgImg, 0, 0, exportWidth, exportHeight);
        ctx.restore();

        if (bgDarken > 0) {
          ctx.fillStyle = `rgba(0, 0, 0, ${bgDarken / 100})`;
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        }
      } else if (customBgColor) {
        ctx.fillStyle = customBgColor;
        ctx.fillRect(0, 0, exportWidth, exportHeight);
      } else if (selectedBg.fill) {
        ctx.fillStyle = selectedBg.fill;
        ctx.fillRect(0, 0, exportWidth, exportHeight);
      }

      if (sourceImg && subjectBgBlur > 0) {
        const exportBlur = (subjectBgBlur * Math.max(exportWidth, exportHeight)) / 500;
        const bleed = exportBlur * 2;
        ctx.save();
        ctx.filter = `blur(${exportBlur}px)`;
        ctx.drawImage(sourceImg, -bleed, -bleed, exportWidth + bleed * 2, exportHeight + bleed * 2);
        ctx.restore();
      }

      // 2. Draw Subject Layer (Positioned & scaled relative to Artboard)
      const currentTf = fabricEditorRef.current?.getCurrentTransform?.() || subjectTransform || DEFAULT_SUBJECT_TRANSFORM;
      const cutoutCenterX = exportWidth / 2 + currentTf.relX * exportWidth;
      const cutoutCenterY = exportHeight / 2 + currentTf.relY * exportHeight;

      const fitFactor = bgImg ? 0.75 : 1.0;
      const baseFit = Math.min((exportWidth * fitFactor) / cutoutImg.width, (exportHeight * fitFactor) / cutoutImg.height, 1);
      const drawW = cutoutImg.width * baseFit * currentTf.scale;
      const drawH = cutoutImg.height * baseFit * currentTf.scale;

      ctx.save();
      ctx.translate(cutoutCenterX, cutoutCenterY);
      ctx.rotate((currentTf.rotation * Math.PI) / 180);
      ctx.scale(currentTf.flipX ? -1 : 1, currentTf.flipY ? -1 : 1);

      let filterString = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px)`;
      if (effects.stroke) {
        filterString += ` drop-shadow(0 0 ${effects.strokeWidth}px ${effects.strokeColor}) drop-shadow(0 0 1px ${effects.strokeColor})`;
      }
      ctx.filter = filterString;

      if (effects.shadow) {
        const shadowAlpha = (effects.shadowOpacity ?? 50) / 100;
        ctx.shadowColor = effects.shadowColor || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = effects.shadowBlur * 2;
        ctx.shadowOffsetY = (effects.shadowOffsetY ?? 14) * 2;
      }

      ctx.drawImage(cutoutImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // 3. Render Design Layers (Vector Elements & Text)
      renderDesignLayersToCanvas(ctx, exportWidth, exportHeight, textLayers, elementLayers);

      // 4. Export Blob
      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      canvas.toBlob(
        (blob) => {
          if (!blob) throw new Error('Blob creation failed');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = downloadName(job.name).replace(/\.png$/, `.${format}`);
          a.click();
          URL.revokeObjectURL(url);
          setIsDownloading(false);
          addToast('success', 'Download complete!');
        },
        mimeType,
        0.95
      );
    } catch (err: any) {
      console.error('Download export failed:', err);
      setIsDownloading(false);
      addToast('error', `Download failed: ${err.message || 'unknown'}`);
    }
  }

  function handleCustomBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      recordEditorEdit();
      const url = URL.createObjectURL(file);
      setCustomBgImage(url);
      setCustomBgColor(undefined);
      setSubjectBgBlur(0);
      addToast('success', 'Custom background photo applied!');
    }
  }

  const handleUpload = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      addToast('error', 'Please choose images under 20 MB.');
      return;
    }
    if (onFileAdd) {
      onFileAdd([file]);
      return;
    }
    const newJob: BGJob = {
      id: makeId(),
      file,
      name: file.name,
      sourceUrl: URL.createObjectURL(file),
      resultUrl: null,
      resultBlob: null,
      status: 'ready',
      progress: 0,
      message: 'Queued for cutout processing',
    };
    setJobs((prev) => [...prev, newJob]);
    setSelectedId(newJob.id);
    addToast('success', `Image "${file.name}" ready for cutout.`);
  };

  const filteredElements = ELEMENT_PRESETS.filter((p) => {
    if (elementCategory === 'all') return true;
    return p.category === elementCategory;
  });

  return (
    <div className="flex w-full flex-col items-center gap-2 px-2">
      {/* CANVA-STYLE WORKSPACE (ACTIVE AFTER UPLOADING IMAGES) */}
      {jobs.length > 0 ? (
        <>
          {/* ========================================================================= */}
          {/* 1. TOP FLOATING NAVBAR / TOOLBAR PILL (MATCHING UI REFERENCE) */}
          {/* ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sticky max-w-4xl bg-white/95 dark:bg-[#16161E]/95 border border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-white rounded-full px-5 py-2.5 shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 z-30"
          >
            {/* LEFT SIDE: FEATURE TABS */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
              {[
                { id: 'cutout' as TabType, label: 'Cutout', Icon: Scissors },
                { id: 'background' as TabType, label: 'Background', Icon: ImageIcon },
                { id: 'effects' as TabType, label: 'Effects', Icon: Sparkles },
                { id: 'adjust' as TabType, label: 'Adjust', Icon: SlidersHorizontal },
                { id: 'design' as TabType, label: 'Design', Icon: PanelsTopLeft },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (activeTab === 'adjust' && fabricEditorRef.current?.getCurrentTransform) {
                      const curTf = fabricEditorRef.current.getCurrentTransform();
                      if (curTf) setSubjectTransform(curTf);
                    }
                    if (tab.id === 'adjust') {
                      if (!fabricEditMode) {
                        savedTransformBeforeEditRef.current = subjectTransform;
                        setFabricEditMode('transform');
                      }
                    } else if (fabricEditMode) {
                      setFabricEditMode(null);
                    }
                    setActiveTab(tab.id);
                  }}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === tab.id
                    ? 'bg-slate-200/80 dark:bg-white/15 text-slate-900 dark:text-white font-bold shadow-sm'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                >
                  <tab.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* RIGHT SIDE: UTILITIES (COMPARE, UNDO, REDO) + PRIMARY DOWNLOAD BUTTON */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-white/15" />

              {/* COMPARE SPLIT TOGGLE [|] */}
              <button
                type="button"
                onClick={() => setIsCompareMode((prev) => !prev)}
                className={`p-2 rounded-full transition cursor-pointer flex items-center justify-center ${isCompareMode
                  ? 'bg-white text-slate-900 shadow-md ring-2 ring-white/30'
                  : 'text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                title="Toggle Before/After Compare"
                aria-label="Toggle Before/After Compare"
              >
                <Columns2 className="h-4 w-4" />
              </button>

              {/* UNDO BUTTON */}
              <button
                type="button"
                disabled={!canUndoEditor}
                onClick={undoEditorEdit}
                className="p-2 rounded-full text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition flex items-center justify-center cursor-pointer"
                title={canUndoEditor ? 'Undo Last Modification' : 'No Modifications to Undo'}
                aria-label="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </button>

              {/* REDO BUTTON */}
              <button
                type="button"
                disabled={!canRedoEditor}
                onClick={redoEditorEdit}
                className="p-2 rounded-full text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition flex items-center justify-center cursor-pointer"
                title={canRedoEditor ? 'Redo Last Modification' : 'No Modifications to Redo'}
                aria-label="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </button>

              {/* DOWNLOAD DROPDOWN BUTTON */}
              <div className="relative" ref={downloadMenuRef}>
                <button
                  type="button"
                  disabled={!selected?.resultUrl || selected?.status === 'loading' || selected?.status === 'processing' || isDownloading}
                  onClick={() => setDownloadMenuOpen((prev) => !prev)}
                  aria-expanded={downloadMenuOpen}
                  className="px-4 sm:px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  <span>{isDownloading ? 'Rendering' : 'Download'}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {downloadMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#1A1A24] border border-slate-200 dark:border-white/10 shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadFormat('png');
                        setDownloadMenuOpen(false);
                        if (selected) download(selected, 'png');
                      }}
                      className="px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white transition flex items-center justify-between cursor-pointer"
                    >
                      <span>PNG Image</span>
                      <span className="text-[10px] font-mono text-blue-500 font-bold">HD</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDownloadFormat('webp');
                        setDownloadMenuOpen(false);
                        if (selected) download(selected, 'webp');
                      }}
                      className="px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white transition flex items-center justify-between cursor-pointer"
                    >
                      <span>WebP Format</span>
                      <span className="text-[10px] font-mono text-neutral-400">Web</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDownloadFormat('jpeg');
                        setDownloadMenuOpen(false);
                        if (selected) download(selected, 'jpeg');
                      }}
                      className="px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white transition flex items-center justify-between cursor-pointer"
                    >
                      <span>JPG Photo</span>
                      <span className="text-[10px] font-mono text-neutral-400">Solid</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <div className="bgremove-workspace-grid">

            <div className="bgremove-canvas-column">
              {/* STAGE HEADER BAR */}
              <div className="flex w-full flex-wrap items-center justify-between gap-3 px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-neutral-200 border border-slate-300/60 dark:border-white/10 font-bold truncate max-w-xs">
                    📁 {selected?.name || 'Untitled Image'}
                  </span>
                  {selected?.status === 'done' && (
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#00FF85]/15 text-[#00FF85] border border-[#00FF85]/30 font-bold">
                      ✓ Clean Cutout
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#111319]/90 p-1 text-white shadow-lg backdrop-blur-xl">
                  <button type="button" onClick={() => setViewportZoom((zoom) => Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100))} aria-label="Zoom out" title="Zoom out" className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10"><ZoomOut className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setViewportZoom(1)} aria-label="Reset zoom" title="Reset zoom" className="min-w-12 rounded-full px-2 py-1.5 text-xs font-bold tabular-nums transition hover:bg-white/10">{Math.round(viewportZoom * 100)}%</button>
                  <button type="button" onClick={() => setViewportZoom((zoom) => Math.min(3, Math.round((zoom + 0.25) * 100) / 100))} aria-label="Zoom in" title="Zoom in" className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10"><ZoomIn className="h-4 w-4" /></button>
                  <span className="mx-0.5 h-5 w-px bg-white/15" />
                  <button type="button" onClick={() => setViewportZoom(1)} aria-label="Reset zoom" title="Reset zoom" className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>
                </div>
              </div>

              {/* THE UNIFIED STAGE (NO DUPLICATE IMAGES!) */}
              <div className="w-full relative">
                <BGComparator
                  job={selected}
                  activeTab={activeTab}
                  cutoutTool={cutoutTool}
                  brushSize={brushSize}
                  backgroundStyle={selectedBg.style}
                  customBgColor={customBgColor || selectedBg.fill || undefined}
                  customBgImage={customBgImage}
                  subjectBgBlur={subjectBgBlur}
                  bgBlur={bgBlur}
                  bgDarken={bgDarken}
                  adjustments={adjustments}
                  effects={effects}
                  isCompareMode={isCompareMode}
                  rotation={rotation}
                  cropRatio={fabricEditMode === 'crop' ? fabricCropRatioDraft : cropRatio}
                  fabricEditMode={fabricEditMode}
                  fabricEditorRef={fabricEditorRef}
                  cropTarget={cropTarget}
                  cropZoom={cropZoom}
                  subjectTransform={subjectTransform}
                  onCropTargetChange={setCropTarget}
                  onCropZoomChange={setCropZoom}
                  onRotationChange={setRotation}
                  onFabricCropRatioChange={setFabricCropRatioDraft}
                  onApplyTransform={(tf) => {
                    recordEditorEdit();
                    setSubjectTransform(tf);
                    setFabricEditMode(null);
                    addToast('success', 'Subject transform applied!');
                  }}
                  onFabricEditApply={handleFabricEditApply}
                  onFabricEditCancel={() => {
                    setSubjectTransform(savedTransformBeforeEditRef.current);
                    setFabricCropRatioDraft(cropRatio);
                    setFabricEditMode(null);
                  }}
                  viewportZoom={viewportZoom}
                  onViewportZoomChange={setViewportZoom}
                  onBrushStroke={handleBrushStroke}
                  textLayers={textLayers}
                  elementLayers={elementLayers}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onUpdateTextLayerPosition={(id, x, y) => updateTextLayer(id, { x, y })}
                  onUpdateElementLayerPosition={(id, x, y) => updateElementLayer(id, { x, y })}
                  onDeleteLayer={deleteLayer}
                />
              </div>

              {/* BOTTOM THUMBNAIL DOCK */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-20 flex w-full items-center justify-center py-2"
              >
                <div className="mx-auto flex w-fit max-w-full items-center gap-3 overflow-x-auto px-4 pb-2 pt-3">
                  <button
                    type="button"
                    onClick={onOpenPicker}
                    className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-[#17191F] text-2xl font-light text-white/75 transition hover:bg-[#00FF85]/10 hover:text-[#00FF85]"
                    title="Add Image to Workspace"
                    aria-label="Add image to workspace"
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                  {jobs.map((job) => {
                    const isSelected = selected?.id === job.id;
                    return (
                      <div
                        key={job.id}
                        className="group relative h-14 w-14 shrink-0"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(job.id)}
                          aria-label={`Select ${job.name}`}
                          aria-pressed={isSelected}
                          className={`h-full w-full cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ${isSelected
                            ? 'shadow-[0_0_0_2px_rgba(0,255,133,0.7),0_0_16px_rgba(0,255,133,0.2)]'
                            : 'opacity-70 hover:opacity-100'
                            }`}
                        >
                          <img
                            src={job.resultUrl || job.sourceUrl}
                            alt={job.name}
                            className="h-full w-full rounded-2xl object-cover bg-[#13141b]"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeJob(job.id);
                          }}
                          className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 scale-90 items-center justify-center rounded-full border border-white/20 bg-black/90 text-xs font-bold text-white/80 opacity-0 shadow-md transition group-hover:scale-100 group-hover:opacity-100 hover:bg-rose-600 hover:text-white focus:scale-100 focus:opacity-100"
                          title="Delete Image"
                          aria-label={`Remove ${job.name}`}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT SIDE: SETTINGS PANEL FOR (CUTOUT, BG, EFFECTS, ADJUST, DESIGN) */}
            {/* ========================================================================= */}
            <div className="bgremove-settings-column">
              <div className="flex max-h-[calc(100vh-9rem)] flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#12141A]/95 p-4 shadow-2xl backdrop-blur-2xl">

                {/* ACTIVE TAB CONTENT */}
                <div className="min-h-[300px] max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain pr-1">
                  <AnimatePresence mode="wait">
                    {/* TAB 1: CUTOUT */}
                    {activeTab === 'cutout' && (
                      <motion.div
                        key="tab-cutout"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex flex-col gap-4 text-xs font-semibold"
                      >
                        <div>
                          <span className="text-slate-800 dark:text-white font-bold block mb-1.5">
                            Cutout Tools
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setCutoutTool('move')}
                              className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${cutoutTool === 'move'
                                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-neutral-300 hover:bg-zinc-500'
                                }`}
                              title="Move & Pan View (or hold Spacebar anytime)"
                            >
                              <span>✋</span>
                              <span>Move</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCutoutTool('erase')}
                              className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${cutoutTool === 'erase'
                                ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-500/20'
                                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-neutral-300 hover:bg-zinc-500'
                                }`}
                            >
                              <span>✂️</span>
                              <span>Erase</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCutoutTool('restore')}
                              className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${cutoutTool === 'restore'
                                ? 'bg-[#00FF85] border-[#00FF85] text-black shadow-md shadow-[#00FF85]/20 font-black'
                                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-neutral-300 hover:bg-zinc-500'
                                }`}
                            >
                              <span>✦</span>
                              <span>Restore</span>
                            </button>
                          </div>
                        </div>

                        {/* QUICK SHORTCUT HINT */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-neutral-300">
                          <span className="text-sm shrink-0">💡</span>
                          <span>Hold <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-black/50 border border-slate-300 dark:border-white/20 font-mono text-[10px] font-bold text-slate-800 dark:text-neutral-100 shadow-xs">Space</kbd> + drag anytime to move the image while erasing or restoring.</span>
                        </div>

                        {/* BRUSH SIZE SLIDER */}
                        {(cutoutTool === 'erase' || cutoutTool === 'restore') && (
                          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                              <div className="flex items-center gap-2">
                                <span className={`h-3 w-3 rounded-full ${cutoutTool === 'erase' ? 'bg-rose-500' : 'bg-[#00FF85]'}`} />
                                <span className="font-bold">Brush size</span>
                              </div>
                              <output className="rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">{brushSize}px</output>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="120"
                              value={brushSize}
                              onChange={(e) => setBrushSize(Number(e.target.value))}
                              aria-label="Brush size"
                              className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-500 dark:bg-white/15 ${cutoutTool === 'erase' ? 'accent-rose-500' : 'accent-[#00FF85]'}`}
                            />
                            <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40"><span>Fine</span><span>Broad</span></div>
                          </div>
                        )}

                        {/* RESET CUTOUT BUTTON */}
                        <div className="pt-2 flex items-center justify-center">
                          <div className="relative group inline-block">
                            <button
                              type="button"
                              onClick={() => { if (selected) processJob(selected); }}
                              className="px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-400/30 text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <span>↺</span> Re-run AI Cutout
                            </button>

                            {/* Custom Tooltip */}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-md pointer-events-none">
                              Click to process the AI cutout again
                            </span>
                          </div>

                        </div>
                      </motion.div>
                    )}

                    {/* TAB 2: BACKGROUND */}
                    {activeTab === 'background' && (
                      <motion.div
                        key="tab-bg"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex flex-col gap-4 text-xs font-semibold"
                      >
                        {/* Sub-tab switcher */}
                        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => setBgSubTab('photo')}
                            className={`flex-1 py-1.5 rounded-xl font-bold transition ${bgSubTab === 'photo'
                              ? 'bg-white dark:bg-white text-slate-900 shadow-md'
                              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            📷 Photos
                          </button>
                          <button
                            type="button"
                            onClick={() => setBgSubTab('color')}
                            className={`flex-1 py-1.5 rounded-xl font-bold transition ${bgSubTab === 'color'
                              ? 'bg-white dark:bg-white text-slate-900 shadow-md'
                              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            🎨 Colors & Solid
                          </button>
                        </div>

                        {bgSubTab === 'photo' && (
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={subjectBgBlur > 0}
                                onClick={() => {
                                  recordEditorEdit();
                                  if (subjectBgBlur > 0) {
                                    setSubjectBgBlur(0);
                                  } else {
                                    setSubjectBgBlur(12);
                                    setSelectedBg(COLOR_PRESETS[0]);
                                    setCustomBgImage(undefined);
                                    setCustomBgColor(undefined);
                                  }
                                }}
                                className="flex w-full items-center justify-between gap-3 text-left"
                              >
                                <span className="flex flex-col">
                                  <span className="font-bold text-slate-800 dark:text-white">Blur original background</span>
                                  <span className="text-[10px] font-medium text-slate-500 dark:text-white/45">Keeps the detected subject sharp</span>
                                </span>
                                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${subjectBgBlur > 0 ? 'bg-[#00C86A]' : 'bg-slate-300 dark:bg-white/15'}`}>
                                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${subjectBgBlur > 0 ? 'translate-x-6' : 'translate-x-1'}`} />
                                </span>
                              </button>
                              {subjectBgBlur > 0 && (
                                <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
                                  <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                                    <label htmlFor="subject-background-blur" className="font-bold">Blur intensity</label>
                                    <output htmlFor="subject-background-blur" className="font-mono font-bold text-[#00C86A]">{subjectBgBlur}px</output>
                                  </div>
                                  <input
                                    id="subject-background-blur"
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={subjectBgBlur}
                                    onPointerDown={recordEditorEdit}
                                    onChange={(e) => setSubjectBgBlur(Number(e.target.value))}
                                    aria-label="Background blur intensity"
                                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#00C86A] dark:bg-white/15"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-white">Photo Backdrops</span>
                              <input
                                ref={bgFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleCustomBgImageUpload}
                                className="hidden"
                              />
                            </div>

                            <div className="max-h-[168px] overflow-y-auto overscroll-contain pr-1">
                              <div className="grid grid-cols-4 gap-2">
                                <button
                                  type="button"
                                  onClick={() => bgFileInputRef.current?.click()}
                                  className="group flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600 transition hover:border-[#00FF85] hover:bg-[#00FF85]/10 hover:text-[#07834A] dark:border-white/15 dark:bg-white/[0.03] dark:text-white/65 dark:hover:text-[#00FF85]"
                                  aria-label="Upload a backdrop photo"
                                >
                                  <span className="text-xl font-light leading-none">+</span>
                                  <span className="text-[10px] font-bold leading-tight">Add photo</span>
                                </button>
                                {PHOTO_PRESETS.map((photo) => (
                                  <button
                                    key={photo.id}
                                    type="button"
                                    aria-label={`Use ${photo.label} backdrop`}
                                    title={photo.label}
                                    onClick={() => {
                                      recordEditorEdit();
                                      setCustomBgImage(photo.url);
                                      setCustomBgColor(undefined);
                                      setSubjectBgBlur(0);
                                    }}
                                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all shadow-md bg-neutral-900 ${customBgImage === photo.url
                                      ? 'border-[#00FF85] ring-2 ring-[#00FF85]/25'
                                      : 'border-transparent hover:border-white/40'
                                      }`}
                                  >
                                    <img
                                      src={photo.url}
                                      alt={photo.label}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 select-none"
                                      style={{ imageRendering: 'auto' }}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {customBgImage && (
                              <div className="flex flex-col gap-2.5 pt-1">
                                {/* Background Blur & Darken Overlay Sliders (Cutout Style) */}
                                <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                                  {/* Background Blur */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                                      <div className="flex items-center gap-2">
                                        <label htmlFor="backdrop-bg-blur" className="font-bold text-xs text-slate-800 dark:text-white">Background Blur</label>
                                      </div>
                                      <output htmlFor="backdrop-bg-blur" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">{bgBlur}px</output>
                                    </div>
                                    <input
                                      id="backdrop-bg-blur"
                                      type="range"
                                      min="0"
                                      max="25"
                                      value={bgBlur}
                                      onPointerDown={recordEditorEdit}
                                      onChange={(e) => setBgBlur(Number(e.target.value))}
                                      aria-label="Background Blur"
                                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-500 dark:bg-white/15"
                                    />
                                    <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                                      <span>0px</span>
                                      <span>25px</span>
                                    </div>
                                  </div>

                                  {/* Darken Overlay */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                                      <div className="flex items-center gap-2">
                                        <label htmlFor="backdrop-bg-darken" className="font-bold text-xs text-slate-800 dark:text-white">Darken Overlay</label>
                                      </div>
                                      <output htmlFor="backdrop-bg-darken" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">{bgDarken}%</output>
                                    </div>
                                    <input
                                      id="backdrop-bg-darken"
                                      type="range"
                                      min="0"
                                      max="80"
                                      value={bgDarken}
                                      onPointerDown={recordEditorEdit}
                                      onChange={(e) => setBgDarken(Number(e.target.value))}
                                      aria-label="Darken Overlay"
                                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-500 dark:bg-white/15"
                                    />
                                    <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                                      <span>0%</span>
                                      <span>80%</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => { recordEditorEdit(); setCustomBgImage(undefined); }}
                                  className="w-full py-2 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  Clear Backdrop Photo
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {bgSubTab === 'color' && (
                          <div className="flex flex-col gap-3">
                            <span className="font-bold text-slate-800 dark:text-white">Backdrop color</span>
                            <div className="grid grid-cols-4 gap-2.5">
                              {COLOR_PRESETS.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  title={preset.label}
                                  aria-label={`Use ${preset.label} backdrop`}
                                  aria-pressed={selectedBg.id === preset.id && !customBgColor && !customBgImage}
                                  onClick={() => {
                                    recordEditorEdit();
                                    setSelectedBg(preset);
                                    setCustomBgColor(undefined);
                                    setCustomBgImage(undefined);
                                    setSubjectBgBlur(0);
                                  }}
                                  className={`relative aspect-square rounded-xl border-2 transition cursor-pointer ${selectedBg.id === preset.id && !customBgColor && !customBgImage
                                    ? 'border-[#00FF85] ring-2 ring-[#00FF85]/20'
                                    : 'border-transparent hover:border-white/40'
                                    }`}
                                >
                                  <span
                                    className={`absolute inset-0 rounded-[10px] border border-black/10 ${preset.style}`}
                                    style={preset.fill ? { backgroundColor: preset.fill } : {}}
                                  />
                                  {preset.id === 'transparent' && (
                                    <svg className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                      <path fillRule="evenodd" clipRule="evenodd" d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3ZM5 12C5 8.13401 8.13401 5 12 5C13.5725 5 15.0239 5.51851 16.1925 6.39389L6.39389 16.1925C5.51851 15.0239 5 13.5725 5 12ZM7.80819 17.6067C8.97671 18.4817 10.4278 19 12 19C15.866 19 19 15.866 19 12C19 10.4278 18.4817 8.97671 17.6067 7.80819L7.80819 17.6067Z" fill="currentColor" />
                                    </svg>
                                  )}
                                </button>
                              ))}
                              <div className="relative">
                                <div className={`relative aspect-square w-full overflow-hidden rounded-xl border-2 ${customBgColor ? 'border-[#00FF85] ring-2 ring-[#00FF85]/20' : 'border-slate-300 dark:border-white/15'}`}>
                                  <span className="absolute inset-0 rounded-[10px]" style={{ background: customBgColor || 'linear-gradient(135deg, #f72585 0%, #7b2ff7 22%, #247bff 44%, #00c9a7 66%, #ffb703 84%, #f72585 100%)' }} />
                                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-medium text-white drop-shadow">+</span>
                                  <input
                                    type="color"
                                    value={customBgColor || '#ffffff'}
                                    onChange={(event) => {
                                      recordEditorEdit();
                                      setCustomBgColor(event.target.value);
                                      setCustomBgImage(undefined);
                                      setSubjectBgBlur(0);
                                    }}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    aria-label="Open custom backdrop color picker"
                                    title="Custom color"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* TAB 3: EFFECTS */}
                    {activeTab === 'effects' && (
                      <motion.div
                        key="tab-effects"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex flex-col gap-4 text-xs font-semibold"
                      >
                        {/* 1. SOFT DROP SHADOW (TOGGLE ON/OFF + CUTOUT SLIDERS) */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={effects.shadow}
                            onClick={() => {
                              recordEditorEdit();
                              setEffects((prev) => ({ ...prev, shadow: !prev.shadow }));
                            }}
                            className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
                          >
                            <span className="flex flex-col">
                              <span className="font-bold text-slate-800 dark:text-white">Soft Drop Shadow</span>
                              <span className="text-[10px] font-medium text-slate-500 dark:text-white/45">Adds realistic depth and ground shadow</span>
                            </span>
                            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${effects.shadow ? 'bg-[#00C86A]' : 'bg-slate-300 dark:bg-white/15'}`}>
                              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${effects.shadow ? 'translate-x-6' : 'translate-x-1'}`} />
                            </span>
                          </button>

                          {effects.shadow && (
                            <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-white/10">
                              {/* Shadow Blur Slider */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    <label htmlFor="effect-shadow-blur" className="font-bold text-xs text-slate-800 dark:text-white">Shadow Blur</label>
                                  </div>
                                  <output htmlFor="effect-shadow-blur" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">
                                    {effects.shadowBlur}px
                                  </output>
                                </div>
                                <input
                                  id="effect-shadow-blur"
                                  type="range"
                                  min="5"
                                  max="40"
                                  value={effects.shadowBlur}
                                  onPointerDown={recordEditorEdit}
                                  onChange={(e) => setEffects((prev) => ({ ...prev, shadowBlur: Number(e.target.value) }))}
                                  aria-label="Shadow Blur"
                                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-500 dark:bg-white/15"
                                />
                                <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                                  <span>5px</span>
                                  <span>40px</span>
                                </div>
                              </div>

                              {/* Shadow Offset Y Slider */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                    <label htmlFor="effect-shadow-offset-y" className="font-bold text-xs text-slate-800 dark:text-white">Offset Y</label>
                                  </div>
                                  <output htmlFor="effect-shadow-offset-y" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">
                                    {effects.shadowOffsetY ?? 14}px
                                  </output>
                                </div>
                                <input
                                  id="effect-shadow-offset-y"
                                  type="range"
                                  min="0"
                                  max="35"
                                  value={effects.shadowOffsetY ?? 14}
                                  onPointerDown={recordEditorEdit}
                                  onChange={(e) => setEffects((prev) => ({ ...prev, shadowOffsetY: Number(e.target.value) }))}
                                  aria-label="Shadow Offset Y"
                                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 dark:bg-white/15"
                                />
                                <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                                  <span>0px</span>
                                  <span>35px</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. EDGE STROKE / STICKER (TOGGLE ON/OFF + CUTOUT SLIDERS + RGB POPUP) */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={effects.stroke}
                            onClick={() => {
                              recordEditorEdit();
                              setEffects((prev) => ({ ...prev, stroke: !prev.stroke }));
                            }}
                            className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
                          >
                            <span className="flex flex-col">
                              <span className="font-bold text-slate-800 dark:text-white">Edge Stroke / Sticker</span>
                              <span className="text-[10px] font-medium text-slate-500 dark:text-white/45">Outlines cutout for sticker look</span>
                            </span>
                            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${effects.stroke ? 'bg-[#00C86A]' : 'bg-slate-300 dark:bg-white/15'}`}>
                              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${effects.stroke ? 'translate-x-6' : 'translate-x-1'}`} />
                            </span>
                          </button>

                          {effects.stroke && (
                            <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-white/10">
                              {/* Stroke Width Slider in Cutout Style */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-[#00C86A]" />
                                    <label htmlFor="effect-stroke-width" className="font-bold text-xs text-slate-800 dark:text-white">Stroke Width</label>
                                  </div>
                                  <output htmlFor="effect-stroke-width" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">
                                    {effects.strokeWidth}px
                                  </output>
                                </div>
                                <input
                                  id="effect-stroke-width"
                                  type="range"
                                  min="2"
                                  max="16"
                                  value={effects.strokeWidth}
                                  onPointerDown={recordEditorEdit}
                                  onChange={(e) => setEffects((prev) => ({ ...prev, strokeWidth: Number(e.target.value) }))}
                                  aria-label="Stroke Width"
                                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#00C86A] dark:bg-white/15"
                                />
                                <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                                  <span>2px</span>
                                  <span>16px</span>
                                </div>
                              </div>

                              {/* Stroke Color */}
                              <div className="relative flex items-center justify-between pt-1">
                                {/* Invisible native input positioned at left: 0 so the browser anchors the color picker dialog to the left side and prevents it from cutting off on the screen edge */}
                                <input
                                  ref={strokeColorInputRef}
                                  id="effect-stroke-color"
                                  type="color"
                                  value={effects.strokeColor || '#00FF85'}
                                  onChange={(event) => {
                                    recordEditorEdit();
                                    setEffects((prev) => ({ ...prev, strokeColor: event.target.value }));
                                  }}
                                  style={{
                                    position: 'absolute',
                                    left: '0px',
                                    top: '0px',
                                    width: '32px',
                                    height: '32px',
                                    opacity: 0,
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                  }}
                                  aria-label="Open custom stroke color picker"
                                  tabIndex={-1}
                                />

                                <label
                                  htmlFor="effect-stroke-color"
                                  onClick={handleOpenStrokeColorPicker}
                                  className="font-bold text-xs text-slate-800 dark:text-white cursor-pointer select-none"
                                >
                                  Stroke Color
                                </label>
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="effect-stroke-color"
                                    onClick={handleOpenStrokeColorPicker}
                                    className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-white/20 transition"
                                    title="Click to pick custom stroke color"
                                  >
                                    {effects.strokeColor || '#00FF85'}
                                  </label>

                                  {/* Custom RGB Spectrum Color Tile Picker with + button (matching background solids picker) */}
                                  <label
                                    htmlFor="effect-stroke-color"
                                    onClick={handleOpenStrokeColorPicker}
                                    className={`relative h-8 w-8 overflow-hidden rounded-xl border-2 transition hover:scale-105 cursor-pointer block ${
                                      effects.strokeColor
                                        ? 'border-[#00FF85] ring-2 ring-[#00FF85]/20'
                                        : 'border-slate-300 dark:border-white/15'
                                    }`}
                                    title="Open stroke color picker"
                                    aria-label="Open custom stroke color picker"
                                  >
                                    <span
                                      className="absolute inset-0 rounded-[10px]"
                                      style={{
                                        background:
                                          'linear-gradient(135deg, #f72585 0%, #7b2ff7 22%, #247bff 44%, #00c9a7 66%, #ffb703 84%, #f72585 100%)',
                                      }}
                                    />
                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-medium text-white drop-shadow">
                                      +
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. IMAGE ADJUSTMENTS (ALL IN CUTOUT SLIDER STYLE) */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                          <span className="font-bold text-slate-800 dark:text-white">Adjustments</span>

                          {/* Brightness */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                <label htmlFor="adjust-brightness" className="font-bold text-xs text-slate-800 dark:text-white">Brightness</label>
                              </div>
                              <output htmlFor="adjust-brightness" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">
                                {adjustments.brightness}%
                              </output>
                            </div>
                            <input
                              id="adjust-brightness"
                              type="range"
                              min="50"
                              max="150"
                              value={adjustments.brightness}
                              onPointerDown={recordEditorEdit}
                              onChange={(e) => setAdjustments((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
                              aria-label="Brightness"
                              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-white/15"
                            />
                            <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                              <span>50%</span>
                              <span>150%</span>
                            </div>
                          </div>

                          {/* Contrast */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                <label htmlFor="adjust-contrast" className="font-bold text-xs text-slate-800 dark:text-white">Contrast</label>
                              </div>
                              <output htmlFor="adjust-contrast" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">
                                {adjustments.contrast}%
                              </output>
                            </div>
                            <input
                              id="adjust-contrast"
                              type="range"
                              min="50"
                              max="150"
                              value={adjustments.contrast}
                              onPointerDown={recordEditorEdit}
                              onChange={(e) => setAdjustments((prev) => ({ ...prev, contrast: Number(e.target.value) }))}
                              aria-label="Contrast"
                              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 dark:bg-white/15"
                            />
                            <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                              <span>50%</span>
                              <span>150%</span>
                            </div>
                          </div>

                          {/* Saturation */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <label htmlFor="adjust-saturation" className="font-bold text-xs text-slate-800 dark:text-white">Saturation</label>
                              </div>
                              <output htmlFor="adjust-saturation" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">
                                {adjustments.saturation}%
                              </output>
                            </div>
                            <input
                              id="adjust-saturation"
                              type="range"
                              min="0"
                              max="200"
                              value={adjustments.saturation}
                              onPointerDown={recordEditorEdit}
                              onChange={(e) => setAdjustments((prev) => ({ ...prev, saturation: Number(e.target.value) }))}
                              aria-label="Saturation"
                              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-500 dark:bg-white/15"
                            />
                            <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                              <span>0%</span>
                              <span>200%</span>
                            </div>
                          </div>

                          {/* Blur / Soften */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-sky-500" />
                                <label htmlFor="adjust-blur" className="font-bold text-xs text-slate-800 dark:text-white">Blur / Soften</label>
                              </div>
                              <output htmlFor="adjust-blur" className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white">
                                {adjustments.blur}px
                              </output>
                            </div>
                            <input
                              id="adjust-blur"
                              type="range"
                              min="0"
                              max="15"
                              value={adjustments.blur}
                              onPointerDown={recordEditorEdit}
                              onChange={(e) => setAdjustments((prev) => ({ ...prev, blur: Number(e.target.value) }))}
                              aria-label="Blur / Soften"
                              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500 dark:bg-white/15"
                            />
                            <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-white/40">
                              <span>0px</span>
                              <span>15px</span>
                            </div>
                          </div>
                        </div>

                        {/* RESET EFFECTS BUTTON (RESETS SHADOW, STROKE & ADJUSTMENTS) */}
                        <button
                          type="button"
                          onClick={() => {
                            recordEditorEdit();
                            setEffects({
                              shadow: false,
                              shadowBlur: 16,
                              shadowOffsetY: 14,
                              shadowOpacity: 50,
                              shadowColor: '#000000',
                              stroke: false,
                              strokeColor: '#00FF85',
                              strokeWidth: 4,
                              glow: false,
                              glowColor: '#00FF85',
                            });
                            setAdjustments({
                              brightness: 100,
                              contrast: 100,
                              saturation: 100,
                              blur: 0,
                            });
                          }}
                          className="w-full py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>↺</span> Reset Effects
                        </button>
                      </motion.div>
                    )}

                    {/* TAB 4: TRANSFORM & CROP */}
                    {activeTab === 'adjust' && (
                      <motion.div
                        key="tab-adjust"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex flex-col gap-3.5 text-xs font-semibold"
                      >
                        <div>
                          <span className="mb-1.5 block font-bold text-slate-800 dark:text-white">Subject position</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                recordEditorEdit();
                                savedTransformBeforeEditRef.current = subjectTransform;
                                setFabricEditMode('transform');
                                setCutoutTool('move');
                              }}
                              aria-pressed={fabricEditMode === 'transform'}
                              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${fabricEditMode === 'transform'
                                ? 'border-[#00FF85] bg-[#00FF85]/15 text-[#087847] dark:text-[#00FF85]'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10'
                                }`}
                            >
                              <span aria-hidden="true">✋</span><span>Transform</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { recordEditorEdit(); setFabricCropRatioDraft(cropRatio); setCropRotationDraft(0); setFabricEditMode('crop'); setCutoutTool('move'); }}
                              aria-pressed={fabricEditMode === 'crop'}
                              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${fabricEditMode === 'crop'
                                ? 'border-[#00FF85] bg-[#00FF85]/15 text-[#087847] dark:text-[#00FF85]'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10'
                                }`}
                            >
                              <CropIcon className="h-4 w-4" /><span>Crop</span>
                            </button>
                          </div>
                        </div>

                        {fabricEditMode === 'transform' ? (
                          /* TRANSFORM SECTION UI - FREEFORM */
                          <div className="flex flex-col gap-4 py-1">
                            <div className="flex flex-col gap-2">
                              <span className="font-bold text-slate-800 dark:text-white">Transform Tools</span>
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => { recordEditorEdit(); fabricEditorRef.current?.flipX(); }}
                                  title="Mirror horizontal"
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 cursor-pointer"
                                >
                                  <FlipHorizontal className="h-4 w-4" />
                                  <span>Mirror</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { recordEditorEdit(); fabricEditorRef.current?.flipY(); }}
                                  title="UpDown vertical"
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 cursor-pointer"
                                >
                                  <FlipVertical className="h-4 w-4" />
                                  <span>UpDown</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { recordEditorEdit(); fabricEditorRef.current?.resetTransform(); }}
                                  title="Reset transform"
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 cursor-pointer"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  <span>Reset</span>
                                </button>
                              </div>
                            </div>

                            {/* ACTION BUTTONS (NO LINE ABOVE) */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleFabricSidebarCancel}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleFabricSidebarApply}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#00FF85] px-3 py-2.5 text-xs font-bold text-black transition hover:bg-[#00e676] cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                                <span>Apply Transform</span>
                              </button>
                            </div>
                          </div>
                        ) : fabricEditMode === 'crop' ? (
                          /* CROP SECTION UI - FREEFORM */
                          <div className="flex flex-col gap-4 py-1">
                            {/* CROP TARGET: CROP FRAME VS MOVE IMAGE */}
                            <div className="flex flex-col gap-2">
                              <span className="font-bold text-slate-800 dark:text-white">Crop Target</span>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCropTarget('frame');
                                    fabricEditorRef.current?.selectCropFrame();
                                  }}
                                  aria-pressed={cropTarget === 'frame'}
                                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${cropTarget === 'frame'
                                    ? 'border-[#00FF85] bg-[#00FF85]/15 text-[#087847] dark:text-[#00FF85]'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                  <span>Crop frame</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCropTarget('image');
                                    fabricEditorRef.current?.selectCropImage();
                                  }}
                                  aria-pressed={cropTarget === 'image'}
                                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${cropTarget === 'image'
                                    ? 'border-[#00FF85] bg-[#00FF85]/15 text-[#087847] dark:text-[#00FF85]'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                  <span>Move image</span>
                                </button>
                              </div>
                            </div>

                            {/* CROP ZOOM SLIDER */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between text-slate-800 dark:text-white">
                                <span className="font-bold">Crop zoom</span>
                                <span className="font-mono font-bold text-blue-500">{cropZoom}%</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="50"
                                  max="200"
                                  value={cropZoom}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setCropZoom(val);
                                    fabricEditorRef.current?.setCropZoom(val);
                                  }}
                                  className="flex-1 cursor-pointer accent-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCropZoom(100);
                                    fabricEditorRef.current?.setCropZoom(100);
                                  }}
                                  className="rounded-lg bg-slate-200 px-2.5 py-1 text-[10px] font-bold transition hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
                                >
                                  100%
                                </button>
                              </div>
                            </div>

                            {/* ASPECT RATIO FEATURES */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between text-slate-800 dark:text-white">
                                <span className="font-bold">Aspect Ratio</span>
                                <CropIcon className="h-4 w-4 text-slate-400" />
                              </div>
                              <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-slate-100 dark:bg-white/5 p-1">
                                {(['free', '1:1', '4:5', '16:9', '9:16'] as const).map((ratio) => (
                                  <button
                                    key={ratio}
                                    type="button"
                                    onClick={() => {
                                      recordEditorEdit();
                                      setFabricCropRatioDraft(ratio);
                                      setCropRatio(ratio);
                                    }}
                                    aria-pressed={fabricCropRatioDraft === ratio}
                                    className={`rounded-lg py-2 text-[11px] font-bold transition cursor-pointer text-center ${fabricCropRatioDraft === ratio
                                      ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
                                      : 'text-slate-500 hover:text-slate-900 dark:text-white/45 dark:hover:text-white'
                                      }`}
                                  >
                                    {ratio === 'free' ? 'Free' : ratio}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* ROTATE SLIDER BAR (APPLIES ONLY WHEN DONE CLICKED) */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between text-slate-800 dark:text-white">
                                <span className="font-bold">Rotate</span>
                                <span className="font-mono font-bold text-blue-500">{cropRotationDraft}°</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="-180"
                                  max="180"
                                  step="1"
                                  value={cropRotationDraft}
                                  onPointerDown={recordEditorEdit}
                                  onChange={(e) => {
                                    const angle = Number(e.target.value);
                                    setCropRotationDraft(angle);
                                    fabricEditorRef.current?.setRotation(angle);
                                  }}
                                  className="flex-1 cursor-pointer accent-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    recordEditorEdit();
                                    setCropRotationDraft(0);
                                    fabricEditorRef.current?.setRotation(0);
                                  }}
                                  className="rounded-lg bg-slate-200 px-2.5 py-1 text-[10px] font-bold transition hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
                                >
                                  0°
                                </button>
                              </div>
                            </div>

                            {/* ACTION BUTTONS (CANCEL & DONE) */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleFabricSidebarCancel}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleFabricSidebarApply}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#00FF85] px-3 py-2.5 text-xs font-bold text-black transition hover:bg-[#00e676] cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                                <span>Done</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] gap-2">
                            <span className="text-2xl mb-1">✋</span>
                            <p className="text-xs font-bold text-slate-800 dark:text-white">Subject Position</p>
                            <p className="text-[11px] text-slate-500 dark:text-neutral-400">Choose Transform to resize and move, or Crop to frame your subject.</p>
                            <button
                              type="button"
                              onClick={() => {
                                recordEditorEdit();
                                savedTransformBeforeEditRef.current = subjectTransform;
                                setFabricEditMode('transform');
                                setCutoutTool('move');
                              }}
                              className="mt-2 px-4 py-2 rounded-xl bg-[#00FF85] text-black font-bold text-xs hover:bg-[#00e676] transition cursor-pointer"
                            >
                              Start Transform
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* TAB 5: DESIGN (TEXT & ELEMENTS) */}
                    {activeTab === 'design' && (
                      <motion.div
                        key="tab-design"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex flex-col gap-4 text-xs font-semibold"
                      >
                        {/* Sub-tab Switcher: Text vs Elements vs Layers */}
                        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('text')}
                            className={`flex-1 py-1.5 rounded-xl font-bold transition ${designSubTab === 'text'
                              ? 'bg-white dark:bg-white text-slate-900 shadow-md'
                              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            ✏️ Text
                          </button>
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('elements')}
                            className={`flex-1 py-1.5 rounded-xl font-bold transition ${designSubTab === 'elements'
                              ? 'bg-white dark:bg-white text-slate-900 shadow-md'
                              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            🎨 Elements
                          </button>
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('layers')}
                            className={`flex-1 py-1.5 rounded-xl font-bold transition ${designSubTab === 'layers'
                              ? 'bg-white dark:bg-white text-slate-900 shadow-md'
                              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            📑 Layers ({textLayers.length + elementLayers.length})
                          </button>
                        </div>

                        {/* DESIGN: TEXT SECTION */}
                        {designSubTab === 'text' && (
                          <div className="flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => addCustomText('Your text', 32)}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF85] px-3 py-2.5 text-xs font-extrabold text-[#07110B] shadow-md shadow-[#00FF85]/10 transition hover:bg-[#35FFA0]"
                            >
                              <span className="text-base font-light">+</span>
                              <span>Add text box</span>
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => addCustomText('Add a heading', 42)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-lg font-extrabold text-slate-900 transition hover:border-[#00B96B] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
                              >
                                Add a heading
                              </button>
                              <button
                                type="button"
                                onClick={() => addCustomText('Add body text', 20)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-[#00B96B] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75 dark:hover:bg-white/[0.08]"
                              >
                                Add body text
                              </button>
                            </div>

                            {/* Selected Text Layer Inspector */}
                            {selectedTextLayer ? (
                              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-slate-800 dark:text-white">Text</span>
                                  <button
                                    type="button"
                                    onClick={() => deleteLayer(selectedTextLayer.id)}
                                    className="rounded-md px-2 py-1 text-[11px] font-bold text-rose-500 transition hover:bg-rose-500/10 hover:text-rose-600"
                                  >
                                    Delete
                                  </button>
                                </div>

                                <textarea
                                  rows={2}
                                  value={selectedTextLayer.text}
                                  onChange={(e) => updateTextLayer(selectedTextLayer.id, { text: e.target.value })}
                                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00B96B] dark:border-white/15 dark:bg-[#111319] dark:text-white"
                                  placeholder="Type your text"
                                  aria-label="Text box content"
                                />

                                <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-1.5 dark:border-white/15 dark:bg-[#111319]">
                                  <select
                                    value={selectedTextLayer.fontFamily}
                                    onChange={(e) => updateTextLayer(selectedTextLayer.id, { fontFamily: e.target.value })}
                                    className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-xs font-bold text-slate-800 outline-none dark:text-white"
                                    aria-label="Font family"
                                  >
                                    {FONT_FAMILIES.map((font) => (
                                      <option key={font.id} value={font.id}>{font.label}</option>
                                    ))}
                                  </select>
                                  <span className="h-5 w-px bg-slate-200 dark:bg-white/10" />
                                  <button
                                    type="button"
                                    onClick={() => updateTextLayer(selectedTextLayer.id, { fontSize: Math.max(16, selectedTextLayer.fontSize - 2) })}
                                    className="h-7 w-7 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-white/75 dark:hover:bg-white/10"
                                    aria-label="Decrease font size"
                                  >−</button>
                                  <span className="min-w-8 text-center font-mono text-xs font-bold text-slate-800 dark:text-white">{selectedTextLayer.fontSize}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateTextLayer(selectedTextLayer.id, { fontSize: Math.min(80, selectedTextLayer.fontSize + 2) })}
                                    className="h-7 w-7 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-white/75 dark:hover:bg-white/10"
                                    aria-label="Increase font size"
                                  >+</button>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-white/55">Font color</span>
                                  <div className="flex items-center gap-1.5">
                                    {COLOR_PALETTE.map((col) => (
                                      <button
                                        key={col}
                                        type="button"
                                        title={col}
                                        aria-label={`Set text color ${col}`}
                                        aria-pressed={selectedTextLayer.color === col}
                                        onClick={() => updateTextLayer(selectedTextLayer.id, { color: col })}
                                        className={`h-5 w-5 rounded-md border border-black/20 transition ${selectedTextLayer.color === col ? 'ring-2 ring-[#00B96B] ring-offset-1 dark:ring-offset-[#17191F]' : 'hover:scale-110'
                                          }`}
                                        style={{ backgroundColor: col }}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateTextLayer(selectedTextLayer.id, { fontWeight: selectedTextLayer.fontWeight === 'normal' ? 'bold' : 'normal' })}
                                    aria-pressed={selectedTextLayer.fontWeight !== 'normal'}
                                    className={`h-8 w-9 rounded-lg border text-sm font-black transition ${selectedTextLayer.fontWeight !== 'normal' ? 'border-[#00B96B]/40 bg-[#00FF85]/15 text-[#087847] dark:text-[#00FF85]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'}`}
                                    title="Toggle bold"
                                    aria-label="Toggle bold"
                                  >B</button>
                                  <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5" aria-label="Text alignment">
                                    {(['left', 'center', 'right'] as const).map((align) => (
                                      <button
                                        key={align}
                                        type="button"
                                        onClick={() => updateTextLayer(selectedTextLayer.id, { align })}
                                        aria-label={`Align ${align}`}
                                        aria-pressed={selectedTextLayer.align === align}
                                        className={`h-7 w-8 rounded-md text-xs font-bold transition ${selectedTextLayer.align === align ? 'bg-[#00FF85] text-[#07110B]' : 'text-slate-600 hover:bg-slate-100 dark:text-white/65 dark:hover:bg-white/10'}`}
                                      >{align === 'left' ? '≡' : align === 'center' ? '☰' : '≡'}</button>
                                    ))}
                                  </div>
                                  <select
                                    value={selectedTextLayer.bgPill || 'none'}
                                    onChange={(e) => updateTextLayer(selectedTextLayer.id, { bgPill: e.target.value as TextLayer['bgPill'] })}
                                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-[#111319] dark:text-white/75"
                                    aria-label="Text background"
                                  >
                                    <option value="none">No background</option>
                                    <option value="black">Dark background</option>
                                    <option value="white">White background</option>
                                    <option value="mint">Pixelify mint</option>
                                    <option value="crimson">Crimson background</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <p className="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-[11px] text-slate-500 dark:border-white/15 dark:text-white/45">
                                Add a text box to edit its font and styling.
                              </p>
                            )}
                          </div>
                        )}

                        {/* DESIGN: ELEMENTS & BADGES SECTION */}
                        {designSubTab === 'elements' && (
                          <div className="flex flex-col gap-3">
                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                              {[
                                { id: 'all', label: 'All' },
                                { id: 'badges', label: 'Badges' },
                                { id: 'shapes', label: 'Shapes' },
                                { id: 'stickers', label: 'Stickers' },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setElementCategory(cat.id as any)}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition shrink-0 ${elementCategory === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-white'
                                    }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>

                            {/* Grid of Elements */}
                            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                              {filteredElements.map((el) => (
                                <button
                                  key={el.key}
                                  type="button"
                                  onClick={() => addElementPreset(el)}
                                  className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-center transition group cursor-pointer"
                                  title={`Add ${el.name}`}
                                >
                                  {el.type === 'badge' ? (
                                    <span
                                      className="px-2 py-0.5 rounded-full font-black text-[10px] border shadow"
                                      style={{ borderColor: el.defaultColor, color: el.defaultColor }}
                                    >
                                      {el.badgeText || el.name}
                                    </span>
                                  ) : el.path ? (
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="w-6 h-6 group-hover:scale-115 transition-transform"
                                      fill={el.defaultColor}
                                    >
                                      <path d={el.path} />
                                    </svg>
                                  ) : null}
                                  <span className="text-[10px] text-slate-700 dark:text-neutral-300 font-bold truncate max-w-full">
                                    {el.name}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Selected Element Inspector */}
                            {selectedElementLayer && (
                              <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/30 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-blue-600 dark:text-blue-400">
                                    Selected: {selectedElementLayer.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteLayer(selectedElementLayer.id)}
                                    className="text-rose-500 hover:text-rose-600 font-bold text-[11px]"
                                  >
                                    ✕ Delete
                                  </button>
                                </div>

                                {selectedElementLayer.type === 'badge' && (
                                  <input
                                    type="text"
                                    value={selectedElementLayer.badgeText || ''}
                                    onChange={(e) =>
                                      updateElementLayer(selectedElementLayer.id, { badgeText: e.target.value })
                                    }
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#16161E] text-slate-900 dark:text-white font-bold text-xs"
                                    placeholder="Badge text..."
                                  />
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <label className="flex flex-col gap-1">
                                    <span className="text-[10px] text-neutral-400">
                                      Size ({selectedElementLayer.size}px)
                                    </span>
                                    <input
                                      type="range"
                                      min="40"
                                      max="240"
                                      value={selectedElementLayer.size}
                                      onChange={(e) =>
                                        updateElementLayer(selectedElementLayer.id, {
                                          size: Number(e.target.value),
                                        })
                                      }
                                      className="accent-blue-500 cursor-pointer"
                                    />
                                  </label>

                                  <label className="flex flex-col gap-1">
                                    <span className="text-[10px] text-neutral-400">
                                      Rotation ({selectedElementLayer.rotation || 0}°)
                                    </span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="360"
                                      value={selectedElementLayer.rotation || 0}
                                      onChange={(e) =>
                                        updateElementLayer(selectedElementLayer.id, {
                                          rotation: Number(e.target.value),
                                        })
                                      }
                                      className="accent-blue-500 cursor-pointer"
                                    />
                                  </label>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[11px] text-neutral-400">Color:</span>
                                  <div className="flex items-center gap-1.5">
                                    {COLOR_PALETTE.map((col) => (
                                      <button
                                        key={col}
                                        type="button"
                                        onClick={() => updateElementLayer(selectedElementLayer.id, { color: col })}
                                        className={`w-4 h-4 rounded-full border ${selectedElementLayer.color === col
                                          ? 'ring-2 ring-blue-500 scale-110'
                                          : 'opacity-80'
                                          }`}
                                        style={{ backgroundColor: col }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* DESIGN: LAYERS MANAGER */}
                        {designSubTab === 'layers' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-white">Active Layers</span>
                              {(textLayers.length > 0 || elementLayers.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    recordEditorEdit();
                                    setTextLayers([]);
                                    setElementLayers([]);
                                    setSelectedLayerId(null);
                                    addToast('info', 'All design layers cleared.');
                                  }}
                                  className="text-rose-500 hover:text-rose-600 text-[11px] font-bold"
                                >
                                  Clear All
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                              {textLayers.map((tl) => (
                                <div
                                  key={tl.id}
                                  onClick={() => setSelectedLayerId(tl.id)}
                                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${selectedLayerId === tl.id
                                    ? 'border-blue-500 bg-blue-500/10 font-bold'
                                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                                    }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span>✏️</span>
                                    <span className="truncate">{tl.text}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteLayer(tl.id);
                                    }}
                                    className="text-neutral-400 hover:text-rose-500 p-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              {elementLayers.map((el) => (
                                <div
                                  key={el.id}
                                  onClick={() => setSelectedLayerId(el.id)}
                                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${selectedLayerId === el.id
                                    ? 'border-blue-500 bg-blue-500/10 font-bold'
                                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                                    }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span>🎨</span>
                                    <span className="truncate">{el.badgeText || el.name}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteLayer(el.id);
                                    }}
                                    className="text-neutral-400 hover:text-rose-500 p-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              {textLayers.length === 0 && elementLayers.length === 0 && (
                                <p className="text-center text-neutral-400 text-xs py-6">
                                  No design layers yet. Add text or elements to get started!
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* EMPTY STATE: USER HAS NOT UPLOADED AN IMAGE YET */
        <div className="flex flex-col gap-6 w-full">

          <DeviceRecommendationNotice tool="bg_remove" />

          <UploadArea
            onFile={handleUpload}
            isLoading={false}
            onClear={() => setJobs([])}
            title="Cutout"
            maxSizeMB={20}
            description={'Drop your images here to start cutout\nSelect PNG, JPG, or WebP files under 20MB.'}
            beforeImage="/bgremove/baby-4.jpg"
            afterImage="/bgremove/baby-4-cutout.png"
          />
        </div>
      )}
    </div>
  );
}