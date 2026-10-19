import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crop as CropIcon } from 'lucide-react';
import FabricImageEditor, {
  FabricEditMode,
  FabricCropRatio,
  FabricImageEditorHandle,
  SubjectTransform,
  DEFAULT_SUBJECT_TRANSFORM,
} from '../components/bgremove/FabricImageEditor';
import type { BGJob } from '../types';
import type { TextLayer, ElementLayer } from '../components/bgremove/DesignAssets';
import { ELEMENT_PRESETS } from '../components/bgremove/DesignAssets';

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

export interface ImageEffects {
  shadow: boolean;
  shadowBlur: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowColor?: string;
  stroke: boolean;
  strokeColor: string;
  strokeWidth: number;
  glow?: boolean;
  glowColor?: string;
}

export interface BGComparatorProps {
  job: BGJob;
  activeTab?: 'cutout' | 'background' | 'effects' | 'adjust' | 'design';
  cutoutTool?: 'erase' | 'restore' | 'move';
  brushSize?: number;
  backgroundStyle?: string;
  customBgColor?: string;
  customBgImage?: string;
  subjectBgBlur?: number;
  bgBlur?: number;
  bgDarken?: number;
  adjustments?: ImageAdjustments;
  effects?: ImageEffects;
  isCompareMode?: boolean;
  scale?: number;
  rotation?: number;
  cropRatio?: FabricCropRatio;
  fabricEditMode?: FabricEditMode | null;
  fabricEditorRef?: React.Ref<FabricImageEditorHandle>;
  subjectTransform?: SubjectTransform;
  cropTarget?: 'frame' | 'image';
  cropZoom?: number;
  onCropTargetChange?: (target: 'frame' | 'image') => void;
  onCropZoomChange?: (zoom: number) => void;
  onRotationChange?: (angle: number) => void;
  onFabricCropRatioChange?: (ratio: FabricCropRatio) => void;
  onFabricEditApply?: (blob: Blob) => void;
  onFabricEditCancel?: () => void;
  onApplyTransform?: (transform: SubjectTransform) => void;
  viewportZoom?: number;
  onViewportZoomChange?: (zoom: number) => void;
  onResetView?: () => void;
  onScaleChange?: (scale: number) => void;
  // Brush callback & history
  onBrushStroke?: (newBlob: Blob, newUrl: string) => void;
  undoTrigger?: number;
  redoTrigger?: number;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  // Design layers
  textLayers?: TextLayer[];
  elementLayers?: ElementLayer[];
  selectedLayerId?: string | null;
  onSelectLayer?: (id: string | null) => void;
  onUpdateTextLayerPosition?: (id: string, x: number, y: number) => void;
  onUpdateElementLayerPosition?: (id: string, x: number, y: number) => void;
  onDeleteLayer?: (id: string) => void;
  onResetSubjectPosition?: () => void;
}

export default function BGComparator({
  job,
  activeTab = 'cutout',
  cutoutTool = 'move',
  brushSize = 40,
  backgroundStyle = 'bg-slate-100 dark:bg-neutral-950',
  customBgColor,
  customBgImage,
  subjectBgBlur = 0,
  bgBlur = 0,
  bgDarken = 0,
  adjustments = { brightness: 100, contrast: 100, saturation: 100, blur: 0 },
  effects = { shadow: false, shadowBlur: 15, shadowOffsetY: 15, shadowOpacity: 50, shadowColor: '#000000', stroke: false, strokeColor: '#00FF85', strokeWidth: 4 },
  isCompareMode = false,
  scale = 1,
  rotation = 0,
  cropRatio = 'free',
  fabricEditMode = null,
  fabricEditorRef,
  subjectTransform,
  cropTarget,
  cropZoom,
  onCropTargetChange,
  onCropZoomChange,
  onRotationChange,
  onFabricCropRatioChange,
  onFabricEditApply,
  onFabricEditCancel,
  onApplyTransform,
  viewportZoom = 1,
  onViewportZoomChange,
  onResetView,
  onScaleChange,
  onBrushStroke,
  undoTrigger = 0,
  redoTrigger = 0,
  onHistoryChange,
  textLayers = [],
  elementLayers = [],
  selectedLayerId = null,
  onSelectLayer,
  onUpdateTextLayerPosition,
  onUpdateElementLayerPosition,
  onDeleteLayer,
  onResetSubjectPosition,
}: BGComparatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const artboardRef = useRef<HTMLDivElement | null>(null);
  const [split, setSplit] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [subjectPos, setSubjectPos] = useState({ x: 0, y: 0 });
  const [resultAspectRatio, setResultAspectRatio] = useState<number | null>(null);

  // Viewport Zoom & Pan state (applies to artboard across all modes)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const hasPannedRef = useRef(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isSpaceHeldRef = useRef(false);

  // Cutout section check - spacebar move/pan is strictly enabled only in cutout section
  const isCutoutSection = activeTab === 'cutout' && !fabricEditMode && !isCompareMode;
  const isCutoutSectionRef = useRef(isCutoutSection);
  isCutoutSectionRef.current = isCutoutSection;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Spacebar move is only active in the cutout section; disabled automatically in all other sections
        if (!isCutoutSectionRef.current) {
          return;
        }
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        if (!isSpaceHeldRef.current) {
          isSpaceHeldRef.current = true;
          setIsSpaceHeld(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeldRef.current = false;
        setIsSpaceHeld(false);
      }
    };

    const handleBlur = () => {
      isSpaceHeldRef.current = false;
      setIsSpaceHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Automatically disable Space-held move & active panning when navigating to other sections
  useEffect(() => {
    if (!isCutoutSection) {
      isSpaceHeldRef.current = false;
      setIsSpaceHeld(false);
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      }
      if (viewportZoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
    }
  }, [isCutoutSection, viewportZoom]);

  // Reset pan when zoom resets to 1 or job changes
  useEffect(() => {
    if (viewportZoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [viewportZoom]);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [job?.id]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const isMiddleClick = e.button === 1;
    const isLeftClick = e.button === 0;

    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;
    if (selectedLayerId && !isMiddleClick) return;

    // Moving with space or the move tool is strictly enabled only in the cutout section
    const isCutoutMoveActive = isCutoutSection && (isSpaceHeldRef.current || cutoutTool === 'move');
    const canPan = isCutoutMoveActive || isMiddleClick || viewportZoom > 1;

    if (canPan && (isLeftClick || isMiddleClick)) {
      isPanningRef.current = true;
      hasPannedRef.current = false;
      setIsPanning(true);
      startPanRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    hasPannedRef.current = true;
    setPan({
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      const nextZoom = Math.min(3, Math.max(0.5, Math.round((viewportZoom + delta) * 100) / 100));
      onViewportZoomChange?.(nextZoom);
    } else if (!isCutoutSection && !isPaintingRef.current && viewportZoom > 1) {
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  };

  // Measure stage container dimensions to fit artboard cleanly
  const [containerSize, setContainerSize] = useState({ width: 800, height: 540 });
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 540,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect) {
        setContainerSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Track background photo dimensions
  const [bgDimensions, setBgDimensions] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!customBgImage) {
      setBgDimensions(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setBgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = customBgImage;
  }, [customBgImage]);

  // Track cutout natural dimensions
  const [cutoutDimensions, setCutoutDimensions] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!job.resultUrl) {
      setCutoutDimensions(null);
      setResultAspectRatio(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setCutoutDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setResultAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = job.resultUrl;
  }, [job.id, job.resultUrl]);

  // Compute adaptive artboard dimensions (contain / fit without cropping)
  const naturalArtboardWidth = bgDimensions?.width || cutoutDimensions?.width || 1200;
  const naturalArtboardHeight = bgDimensions?.height || cutoutDimensions?.height || 900;

  let artboardRatio = naturalArtboardWidth / naturalArtboardHeight;
  if (!customBgImage && cropRatio !== 'free') {
    const [rw, rh] = cropRatio.split(':').map(Number);
    if (rw && rh) artboardRatio = rw / rh;
  }

  const maxW = Math.max(200, containerSize.width - 48);
  const maxH = Math.max(200, containerSize.height - 48);

  let artboardDisplayWidth = maxW;
  let artboardDisplayHeight = Math.round(maxW / artboardRatio);
  if (artboardDisplayHeight > maxH) {
    artboardDisplayHeight = maxH;
    artboardDisplayWidth = Math.round(maxH * artboardRatio);
  }

  // Reset subject position when requested or when job changes
  useEffect(() => {
    setSubjectPos({ x: 0, y: 0 });
  }, [job?.id]);

  const isProcessing = job.status === 'loading' || job.status === 'processing';
  const isCutoutActive = activeTab === 'cutout' && !fabricEditMode && !!job.resultUrl && !isProcessing;
  const isBrushMode = isCutoutActive && !isCompareMode && (cutoutTool === 'erase' || cutoutTool === 'restore');
  const isCropMode = fabricEditMode === 'crop';
  const isMoveMode = isCutoutActive && cutoutTool === 'move';

  // -------------------------------------------------------------
  // INTERACTIVE BRUSH CANVAS (SINGLE IMAGE STAGE FOR CUTOUT REFINEMENT)
  // -------------------------------------------------------------
  const brushCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDrawnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastInternalStrokeUrlRef = useRef<string | null>(null);
  const isPaintingRef = useRef(false);
  const [brushCursor, setBrushCursor] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Notify parent of undo/redo availability
  useEffect(() => {
    onHistoryChange?.(undoStack.length > 0, redoStack.length > 0);
  }, [undoStack.length, redoStack.length, onHistoryChange]);

  // Sync cutout image to brush canvas when image loads or changes
  useEffect(() => {
    const canvas = brushCanvasRef.current;
    if (!job?.resultUrl || !canvas) return;
    const resultUrl = job.resultUrl;

    // Only skip redraw if THIS exact canvas element already has the pixels from our own stroke
    if (lastDrawnCanvasRef.current === canvas && resultUrl === lastInternalStrokeUrlRef.current) {
      return;
    }
    let cancelled = false;

    const img = new Image();
    if (resultUrl.startsWith('http') && !resultUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    const drawToCanvas = (loadedImg: HTMLImageElement) => {
      if (cancelled) return;
      const c = brushCanvasRef.current;
      if (!c) return;

      const maxDim = 2048;
      const s = Math.min(1, maxDim / Math.max(loadedImg.width, loadedImg.height));
      c.width = Math.round(loadedImg.width * s);
      c.height = Math.round(loadedImg.height * s);

      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(loadedImg, 0, 0, c.width, c.height);

      lastDrawnCanvasRef.current = c;

      // Reset history stacks only when switching to a completely new source image
      if (resultUrl !== lastInternalStrokeUrlRef.current) {
        setUndoStack([]);
        setRedoStack([]);
      }

      // Load original image to base canvas for restore brush
      const orig = new Image();
      if (job.sourceUrl.startsWith('http') && !job.sourceUrl.startsWith('blob:')) {
        orig.crossOrigin = 'anonymous';
      }
      orig.onload = () => {
        if (cancelled) return;
        const base = document.createElement('canvas');
        base.width = c.width;
        base.height = c.height;
        const bCtx = base.getContext('2d');
        if (bCtx) {
          bCtx.drawImage(orig, 0, 0, base.width, base.height);
          baseImgCanvasRef.current = base;
        }
      };
      orig.src = job.sourceUrl;
    };

    img.onload = () => drawToCanvas(img);
    img.onerror = () => {
      if (img.crossOrigin) {
        const fallback = new Image();
        fallback.onload = () => drawToCanvas(fallback);
        fallback.src = resultUrl;
      }
    };
    img.src = resultUrl;

    return () => {
      cancelled = true;
    };
  }, [job?.id, job?.resultUrl, job?.sourceUrl, isCutoutActive]);

  // Handle Undo trigger
  const prevUndoTrigger = useRef(undoTrigger);
  useEffect(() => {
    if (undoTrigger > 0 && undoTrigger !== prevUndoTrigger.current) {
      prevUndoTrigger.current = undoTrigger;
      const canvas = brushCanvasRef.current;
      if (!canvas || undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      setUndoStack((s) => s.slice(0, -1));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx && prev) {
        const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setRedoStack((s) => [...s, snap]);
        ctx.putImageData(prev, 0, 0);
        canvas.toBlob((blob) => {
          if (blob && onBrushStroke) {
            const url = URL.createObjectURL(blob);
            lastInternalStrokeUrlRef.current = url;
            onBrushStroke(blob, url);
          }
        }, 'image/png');
      }
    }
  }, [undoTrigger, undoStack, onBrushStroke]);

  // Handle Redo trigger
  const prevRedoTrigger = useRef(redoTrigger);
  useEffect(() => {
    if (redoTrigger > 0 && redoTrigger !== prevRedoTrigger.current) {
      prevRedoTrigger.current = redoTrigger;
      const canvas = brushCanvasRef.current;
      if (!canvas || redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      setRedoStack((s) => s.slice(0, -1));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx && next) {
        const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setUndoStack((s) => [...s, snap]);
        ctx.putImageData(next, 0, 0);
        canvas.toBlob((blob) => {
          if (blob && onBrushStroke) {
            const url = URL.createObjectURL(blob);
            lastInternalStrokeUrlRef.current = url;
            onBrushStroke(blob, url);
          }
        }, 'image/png');
      }
    }
  }, [redoTrigger, redoStack, onBrushStroke]);

  // Paint onto brush canvas with transform and rotation awareness
  const paintBrush = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = brushCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentTf = subjectTransform || DEFAULT_SUBJECT_TRANSFORM;
      const fitFactor = customBgImage ? 0.75 : 1.0;
      const baseCutoutFit = cutoutDimensions
        ? Math.min(
          (artboardDisplayWidth * fitFactor) / cutoutDimensions.width,
          (artboardDisplayHeight * fitFactor) / cutoutDimensions.height
        )
        : 1;
      const cutoutW = (cutoutDimensions ? cutoutDimensions.width * baseCutoutFit : artboardDisplayWidth * fitFactor) * currentTf.scale;
      const cutoutH = (cutoutDimensions ? cutoutDimensions.height * baseCutoutFit : artboardDisplayHeight * fitFactor) * currentTf.scale;

      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const angleRad = (-(currentTf.rotation || 0) * Math.PI) / 180;
      const unrotX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
      const unrotY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
      const flipXMult = currentTf.flipX ? -1 : 1;
      const flipYMult = currentTf.flipY ? -1 : 1;
      const localX = unrotX * flipXMult;
      const localY = unrotY * flipYMult;

      const displayedW = (cutoutW || 1) * viewportZoom;
      const displayedH = (cutoutH || 1) * viewportZoom;
      const x = (localX / displayedW + 0.5) * canvas.width;
      const y = (localY / displayedH + 0.5) * canvas.height;
      const radius = (brushSize / 2) * (canvas.width / displayedW);

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
      ctx.clip();

      if (cutoutTool === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      } else if (cutoutTool === 'restore' && baseImgCanvasRef.current) {
        ctx.drawImage(baseImgCanvasRef.current, 0, 0);
      }
      ctx.restore();
    },
    [
      brushSize,
      cutoutTool,
      subjectTransform,
      customBgImage,
      cutoutDimensions,
      artboardDisplayWidth,
      artboardDisplayHeight,
      viewportZoom,
    ]
  );

  const startBrush = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isCompareMode) return;
    if (isSpaceHeldRef.current || e.button === 1 || cutoutTool === 'move') {
      isPanningRef.current = true;
      hasPannedRef.current = false;
      setIsPanning(true);
      startPanRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isPaintingRef.current = true;
    const shouldShow = !isSpaceHeld;
    setBrushCursor({ visible: shouldShow, x: e.clientX, y: e.clientY });

    // Save snapshot before stroke
    const canvas = brushCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        setUndoStack((s) => [...s.slice(-15), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        setRedoStack([]);
      }
    }

    paintBrush(e);
  };

  const moveBrush = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isCompareMode) return;
    if (isPanningRef.current) {
      hasPannedRef.current = true;
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
      return;
    }

    const shouldShow = !isSpaceHeld && cutoutTool !== 'move';
    setBrushCursor({ visible: shouldShow, x: e.clientX, y: e.clientY });

    if (isPaintingRef.current) {
      paintBrush(e);
    }
  };

  const endBrush = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const canvas = brushCanvasRef.current;
    if (!canvas || !onBrushStroke) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      lastInternalStrokeUrlRef.current = url;
      onBrushStroke(blob, url);
    }, 'image/png');
  };

  // -------------------------------------------------------------
  // CSS STYLES FOR FILTERS AND EFFECTS
  // -------------------------------------------------------------
  const filterCSS = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px)`;

  const shadowAlpha = (effects.shadowOpacity ?? 50) / 100;
  const shadowCol = effects.shadowColor || '#000000';
  const shadowOffsetY = effects.shadowOffsetY ?? 15;
  const shadowCSS = effects.shadow
    ? `drop-shadow(0 ${shadowOffsetY}px ${effects.shadowBlur}px ${shadowCol}${Math.round(shadowAlpha * 255)
      .toString(16)
      .padStart(2, '0')})`
    : 'drop-shadow(0 15px 30px rgba(0, 0, 0, 0.2))';

  const strokeCSS = effects.stroke
    ? `drop-shadow(0 0 ${effects.strokeWidth}px ${effects.strokeColor}) drop-shadow(0 0 1px ${effects.strokeColor})`
    : '';

  const combinedFilter = `${filterCSS} ${shadowCSS} ${strokeCSS}`.trim();
  const cropClipPath = (() => {
    if (!resultAspectRatio || cropRatio === 'free') return undefined;
    const [ratioWidth, ratioHeight] = cropRatio.split(':').map(Number);
    const targetRatio = ratioWidth / ratioHeight;
    if (resultAspectRatio > targetRatio) {
      const horizontalInset = ((1 - targetRatio / resultAspectRatio) * 50).toFixed(3);
      return `inset(0 ${horizontalInset}% 0 ${horizontalInset}%)`;
    }
    const verticalInset = ((1 - resultAspectRatio / targetRatio) * 50).toFixed(3);
    return `inset(${verticalInset}% 0 ${verticalInset}% 0)`;
  })();

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none">
      {/* =========================================================
          STAGE CONTAINER (WORKSPACE MATTE)
         ========================================================= */}
      <div
        ref={containerRef}
        onClick={() => {
          if (!hasPannedRef.current) onSelectLayer?.(null);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className={`relative h-[460px] w-full rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl flex items-center justify-center p-4 sm:h-[540px] sm:p-6 lg:h-[640px] transition-all duration-300 isolate bg-[#0d0f17] select-none ${(isCutoutSection && (isSpaceHeld || cutoutTool === 'move')) || viewportZoom > 1
            ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
            : ''
          }`}
      >
        {/* Clean, authentic stage canvas without artificial dot or pixel overlays */}

        {/* =========================================================
            STAGE FLOATING STATUS & CONTROLS PILL
           ========================================================= */}
        <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
          {/* Active Mode Pill Indicator */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-xs font-semibold text-white shadow-lg">
            {isCutoutSection && isSpaceHeld ? (
              <span className="flex items-center gap-1.5 text-blue-400">
                <span>✋</span> Pan Mode (Space held)
              </span>
            ) : isCutoutActive ? (
              cutoutTool === 'move' ? (
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span>✋</span> Cutout Move / Pan Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  {cutoutTool === 'erase' ? '✂️ Erase Brush Active' : '✦ Restore Brush Active'}
                </span>
              )
            ) : isCompareMode ? (
              <span className="flex items-center gap-1.5 text-blue-400">
                <span>[|]</span> Split Compare Active
              </span>
            ) : selectedLayerId ? (
              <span className="flex items-center gap-1.5 text-[#00FF85]">
                <span>✨</span> Design Element Selected
              </span>
            ) : isCropMode ? (
              <span className="flex items-center gap-1.5 text-[#00FF85]">
                <span><CropIcon /></span> Crop frame active · {cropRatio}
              </span>
            ) : (fabricEditMode === 'transform' || activeTab === 'adjust') ? (
              <span className="flex items-center gap-1.5 text-[#00FF85]">
                <span>✋</span> Transform active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span>✋</span> Move & Canvas Active
              </span>
            )}
          </div>

          {/* Quick Stage Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            {job.resultUrl && !isProcessing && (
              <button
                type="button"
                onClick={() => {
                  setSubjectPos({ x: 0, y: 0 });
                  onApplyTransform?.(DEFAULT_SUBJECT_TRANSFORM);
                  onResetSubjectPosition?.();
                }}
                className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 text-[11px] font-bold text-neutral-300 hover:text-white transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                title="Reset Subject Position"
              >
                <span>↺</span> Reset Center
              </button>
            )}
          </div>
        </div>

        {/* =========================================================
            LOADING / PROCESSING STATE
           ========================================================= */}
        {isProcessing || (!job.resultUrl && job.status !== 'error') ? (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center gap-5">
            <img
              src={job.sourceUrl}
              alt="Source preview"
              className="absolute inset-0 w-full h-full object-cover opacity-15 filter blur-2xl scale-110 pointer-events-none"
            />

            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#00FF85]/20 border-t-[#00FF85] border-r-cyan-400 animate-spin shadow-[0_0_25px_rgba(0,255,133,0.4)]" />
              <div className="h-10 w-10 rounded-full bg-white/5 backdrop-blur flex items-center justify-center text-xl">
                🪄
              </div>
            </div>

            <div className="relative z-10 max-w-sm">
              <h4 className="text-xl font-black text-white mb-1 tracking-tight">Extracting Subject...</h4>
              <p className="text-xs text-neutral-400 font-mono">
                {job.message || 'Neural network segmenting edges...'}
              </p>
            </div>

            <div className="relative z-10 w-full max-w-xs h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-[#00FF85] transition-all duration-300 ease-out shadow-[0_0_12px_#00FF85]"
                style={{ width: `${Math.min(100, Math.max(5, typeof job.progress === 'number' ? job.progress : 15))}%` }}
              />
            </div>
            <span className="relative z-10 text-[11px] font-mono text-[#00FF85] font-bold">
              {Math.min(100, Math.max(0, typeof job.progress === 'number' ? job.progress : 15))}% Complete
            </span>
          </div>
        ) : (
          /* =========================================================
              THE ADAPTIVE ARTBOARD (FULL COVERAGE, ZERO CLIPPING)
             ========================================================= */
          <div
            ref={artboardRef}
            className={`relative rounded-2xl shadow-2xl border border-white/10 select-none flex items-center justify-center origin-center overflow-visible ${isPanning ? 'transition-none' : 'transition-transform duration-150'
              }`}
            style={{
              width: `${artboardDisplayWidth}px`,
              height: `${artboardDisplayHeight}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${viewportZoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* 1. ARTBOARD BACKGROUND LAYER */}
            <div className="absolute inset-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none z-0">
              {customBgImage ? (
                <>
                  <img
                    src={customBgImage}
                    alt="Custom Background"
                    className="w-full h-full object-cover transition-all select-none"
                    style={{
                      filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined,
                      imageRendering: 'auto',
                    }}
                  />
                  {bgDarken > 0 && (
                    <div
                      className="absolute inset-0 bg-black transition-opacity"
                      style={{ opacity: bgDarken / 100 }}
                    />
                  )}
                </>
              ) : customBgColor ? (
                <div className="w-full h-full" style={{ backgroundColor: customBgColor }} />
              ) : (
                <div className={`w-full h-full ${backgroundStyle}`} />
              )}

              {subjectBgBlur > 0 && (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
                  <img
                    src={job.sourceUrl}
                    alt="Blurred original background"
                    className="w-full h-full object-cover"
                    style={{ filter: `blur(${subjectBgBlur}px)` }}
                  />
                </div>
              )}
            </div>

            {/* 2. FOREGROUND CONTENT: FABRIC EDITOR OR SPLIT/BRUSH/CUTOUT DISPLAY */}
            {fabricEditMode && !isProcessing && job.resultUrl ? (
              <div className="relative z-10 flex h-full w-full items-center justify-center overflow-visible">
                <FabricImageEditor
                  key={`${job.id}-${fabricEditMode}`}
                  ref={fabricEditorRef}
                  imageUrl={job.resultUrl}
                  artboardWidth={artboardDisplayWidth}
                  artboardHeight={artboardDisplayHeight}
                  naturalArtboardWidth={naturalArtboardWidth}
                  naturalArtboardHeight={naturalArtboardHeight}
                  mode={(fabricEditMode || 'transform') as FabricEditMode}
                  cropRatio={cropRatio as FabricCropRatio}
                  backgroundStyle={backgroundStyle}
                  customBgColor={customBgColor}
                  hasCustomBg={!!customBgImage}
                  subjectTransform={subjectTransform}
                  rotation={rotation}
                  initialRotation={rotation}
                  cropTarget={cropTarget}
                  cropZoom={cropZoom}
                  onCropTargetChange={onCropTargetChange}
                  onCropZoomChange={onCropZoomChange}
                  onCropRatioChange={(ratio) => onFabricCropRatioChange?.(ratio)}
                  onRotationChange={onRotationChange}
                  onApplyTransform={onApplyTransform}
                  onApply={(blob) => {
                    setSubjectPos({ x: 0, y: 0 });
                    onFabricEditApply?.(blob);
                  }}
                  onCancel={() => onFabricEditCancel?.()}
                />
              </div>
            ) : isCutoutActive ? (
              /* INTERACTIVE CUTOUT BRUSH / PAN CANVAS (PERSISTED ACROSS MOVE, ERASE, RESTORE) */
              (() => {
                const currentTf = subjectTransform || DEFAULT_SUBJECT_TRANSFORM;
                const cutoutCenterX = artboardDisplayWidth / 2 + currentTf.relX * artboardDisplayWidth;
                const cutoutCenterY = artboardDisplayHeight / 2 + currentTf.relY * artboardDisplayHeight;
                const fitFactor = customBgImage ? 0.75 : 1.0;
                const baseCutoutFit = cutoutDimensions
                  ? Math.min(
                    (artboardDisplayWidth * fitFactor) / cutoutDimensions.width,
                    (artboardDisplayHeight * fitFactor) / cutoutDimensions.height
                  )
                  : 1;
                const cutoutW = (cutoutDimensions ? cutoutDimensions.width * baseCutoutFit : artboardDisplayWidth * fitFactor) * currentTf.scale;
                const cutoutH = (cutoutDimensions ? cutoutDimensions.height * baseCutoutFit : artboardDisplayHeight * fitFactor) * currentTf.scale;

                return (
                  <div
                    className="absolute inset-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none z-10 flex items-center justify-center"
                    style={{ visibility: isCompareMode ? 'hidden' : 'visible' }}
                  >
                    <canvas
                      ref={brushCanvasRef}
                      className={`pointer-events-auto rounded-xl shadow-2xl touch-none ${isSpaceHeld || cutoutTool === 'move'
                          ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
                          : 'cursor-crosshair'
                        }`}
                      style={{
                        position: 'absolute',
                        left: `${cutoutCenterX}px`,
                        top: `${cutoutCenterY}px`,
                        width: `${cutoutW}px`,
                        height: `${cutoutH}px`,
                        transform: `translate(-50%, -50%) rotate(${currentTf.rotation}deg) scaleX(${currentTf.flipX ? -1 : 1}) scaleY(${currentTf.flipY ? -1 : 1})`,
                        filter: combinedFilter,
                      }}
                      onPointerDown={startBrush}
                      onPointerEnter={(e) => {
                        const shouldShow = !isSpaceHeld && !isCompareMode && cutoutTool !== 'move';
                        setBrushCursor({ visible: shouldShow, x: e.clientX, y: e.clientY });
                      }}
                      onPointerMove={moveBrush}
                      onPointerUp={endBrush}
                      onPointerCancel={endBrush}
                      onPointerLeave={() => {
                        if (!isPaintingRef.current && !isPanningRef.current) {
                          setBrushCursor((v) => ({ ...v, visible: false }));
                        }
                      }}
                    />
                  </div>
                );
              })()
            ) : (
              /* CUTOUT DISPLAY (RESTRICTED CLEANLY TO CHESSBOARD ARTBOARD CANVAS) */
              (() => {
                const currentTf = subjectTransform || DEFAULT_SUBJECT_TRANSFORM;
                const cutoutCenterX = artboardDisplayWidth / 2 + currentTf.relX * artboardDisplayWidth;
                const cutoutCenterY = artboardDisplayHeight / 2 + currentTf.relY * artboardDisplayHeight;
                const fitFactor = customBgImage ? 0.75 : 1.0;
                const baseCutoutFit = cutoutDimensions
                  ? Math.min(
                    (artboardDisplayWidth * fitFactor) / cutoutDimensions.width,
                    (artboardDisplayHeight * fitFactor) / cutoutDimensions.height
                  )
                  : 1;
                const cutoutW = (cutoutDimensions ? cutoutDimensions.width * baseCutoutFit : artboardDisplayWidth * fitFactor) * currentTf.scale;
                const cutoutH = (cutoutDimensions ? cutoutDimensions.height * baseCutoutFit : artboardDisplayHeight * fitFactor) * currentTf.scale;

                return (
                  <div
                    className="absolute inset-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none z-10 flex items-center justify-center"
                    style={{ visibility: isCompareMode ? 'hidden' : 'visible' }}
                  >
                    <div
                      className="absolute pointer-events-none flex items-center justify-center"
                      style={{
                        left: `${cutoutCenterX}px`,
                        top: `${cutoutCenterY}px`,
                        width: `${cutoutW}px`,
                        height: `${cutoutH}px`,
                        transform: `translate(-50%, -50%) rotate(${currentTf.rotation}deg) scaleX(${currentTf.flipX ? -1 : 1}) scaleY(${currentTf.flipY ? -1 : 1})`,
                      }}
                    >
                      <img
                        src={job.resultUrl || job.sourceUrl}
                        alt={job.name}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        style={{ filter: combinedFilter, clipPath: cropClipPath, imageRendering: 'auto' }}
                      />
                    </div>
                  </div>
                );
              })()
            )}

            {/* BEFORE / AFTER SPLIT COMPARISON SLIDER (OVERLAY) */}
            {isCompareMode && (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden z-20">
                <img
                  src={job.resultUrl || job.sourceUrl}
                  alt="Result cutout"
                  className="max-h-full max-w-full object-contain transition-all"
                  style={{ filter: combinedFilter }}
                />

                <div
                  className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                >
                  <img
                    src={job.sourceUrl}
                    alt="Original photo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {/* SLIDER LINE & HANDLE (MATCHING UPSCALE COMPARISON SLIDER IN WHITE) */}
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,.5)]"
                  style={{ left: `${split}%` }}
                >
                  <div className="absolute left-1/2 top-1/2 flex h-[48px] w-[48px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] bg-white shadow-[0_8px_30px_rgba(0,0,0,.4)] pointer-events-none">
                    <div className="flex items-center gap-[5px] text-black">
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                        <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                        <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* CORNER LABELS */}
                <div className="pointer-events-none absolute left-3 top-3 z-30 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                  Original
                </div>
                <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                  Cutout
                </div>

                <input
                  aria-label="Compare original and cutout"
                  type="range"
                  min="0"
                  max="100"
                  value={split}
                  onChange={(e) => setSplit(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                />
              </div>
            )}

            {/* 3. DESIGN OVERLAY LAYERS (TEXT & SHAPES / BADGES / STICKERS) */}
            {!isProcessing && !isCompareMode && !fabricEditMode && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                {/* 1. RENDER ELEMENT LAYERS */}
                {elementLayers.map((el) => {
                  const isSelected = selectedLayerId === el.id;
                  const preset = ELEMENT_PRESETS.find((p) => p.key === el.key);

                  return (
                    <motion.div
                      key={el.id}
                      drag
                      dragConstraints={artboardRef}
                      dragMomentum={false}
                      onDragEnd={(_e, info) => {
                        const rect = artboardRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const deltaX = (info.offset.x / rect.width) * 100;
                        const deltaY = (info.offset.y / rect.height) * 100;
                        onUpdateElementLayerPosition?.(el.id, el.x + deltaX, el.y + deltaY);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLayer?.(el.id);
                      }}
                      className={`absolute pointer-events-auto cursor-move select-none p-1 rounded-xl transition-all ${isSelected ? 'ring-2 ring-[#00FF85] shadow-2xl' : 'hover:ring-1 hover:ring-white/40'
                        }`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                        opacity: el.opacity ?? 1,
                      }}
                    >
                      {el.type === 'badge' ? (
                        <div
                          className="px-4 py-2 rounded-full font-black text-sm border-2 shadow-2xl whitespace-nowrap bg-[#09090D] flex items-center justify-center"
                          style={{
                            borderColor: el.color,
                            color: el.color,
                            fontSize: `${Math.round(el.size * 0.22)}px`,
                            boxShadow: `0 0 20px ${el.color}40`,
                          }}
                        >
                          {el.badgeText || el.name}
                        </div>
                      ) : preset?.path ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill={el.color}
                          style={{
                            width: `${el.size}px`,
                            height: `${el.size}px`,
                            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
                          }}
                        >
                          <path d={preset.path} />
                        </svg>
                      ) : null}

                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer?.(el.id);
                          }}
                          className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-lg hover:bg-rose-700 transition"
                          title="Delete Layer"
                        >
                          ✕
                        </button>
                      )}
                    </motion.div>
                  );
                })}

                {/* 2. RENDER TEXT LAYERS */}
                {textLayers.map((tl) => {
                  const isSelected = selectedLayerId === tl.id;
                  let pillBg = 'transparent';
                  if (tl.bgPill === 'black') pillBg = 'rgba(9, 9, 13, 0.85)';
                  if (tl.bgPill === 'mint') pillBg = '#00FF85';
                  if (tl.bgPill === 'white') pillBg = '#FFFFFF';
                  if (tl.bgPill === 'crimson') pillBg = '#F43F5E';

                  return (
                    <motion.div
                      key={tl.id}
                      drag
                      dragConstraints={artboardRef}
                      dragMomentum={false}
                      onDragEnd={(_e, info) => {
                        const rect = artboardRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const deltaX = (info.offset.x / rect.width) * 100;
                        const deltaY = (info.offset.y / rect.height) * 100;
                        onUpdateTextLayerPosition?.(tl.id, tl.x + deltaX, tl.y + deltaY);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLayer?.(tl.id);
                      }}
                      className={`absolute pointer-events-auto cursor-move select-none p-1.5 rounded-xl transition-all ${isSelected ? 'ring-2 ring-[#00FF85] shadow-2xl' : 'hover:ring-1 hover:ring-white/40'
                        }`}
                      style={{
                        left: `${tl.x}%`,
                        top: `${tl.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className="px-3 py-1 rounded-xl whitespace-pre-wrap transition-colors leading-tight"
                        style={{
                          fontFamily: tl.fontFamily,
                          fontSize: `${tl.fontSize}px`,
                          fontWeight: tl.fontWeight,
                          color: tl.color,
                          textAlign: tl.align,
                          backgroundColor: pillBg,
                          textShadow: tl.shadow ? '0 4px 14px rgba(0,0,0,0.8)' : undefined,
                        }}
                      >
                        {tl.text}
                      </div>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer?.(tl.id);
                          }}
                          className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-lg hover:bg-rose-700 transition"
                          title="Delete Text"
                        >
                          ✕
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================
          BRUSH CURSOR INDICATOR (PORTAL / FIXED)
         ========================================================= */}
      {isCutoutActive && !isCompareMode && brushCursor.visible && !isPanning && !isSpaceHeld && cutoutTool !== 'move' && (
        <span
          className={`fixed pointer-events-none rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity z-50 ${cutoutTool === 'erase'
              ? 'border-rose-400 bg-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              : 'border-[#00FF85] bg-[#00FF85]/20 shadow-[0_0_12px_rgba(0,255,133,0.5)]'
            }`}
          style={{
            width: brushSize,
            height: brushSize,
            left: brushCursor.x,
            top: brushCursor.y,
          }}
        />
      )}
    </div>
  );
}

