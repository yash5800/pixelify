import React, { useEffect, useRef, useState } from "react";
import { MODELS, buildPresetOptions } from "../lib/constants";
import type {
  ModelKey,
  Step,
  EnhancementOptions,
  ScaleFactor,
  UpscaleItem,
} from "../types";
import ParameterSlider from "./ParameterSlider";
import WaitCaption from "./WaitCaption";
import '@/styles/solving-orb.css';
import {
  Sparkles,
  RotateCcw,
  ChevronDown,
  Check,
  Download,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Menu,
  X,
  Images,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  isSoundEnabled,
  setSoundEnabled,
  playSuccessChime,
  primeAudio,
} from "../utils/notifications";
import UpscalerLoader from "./upscaling-loader";
import ModelLoader from "./upscaler/ModelLoader";

/* ============================================================
   IMAGE CIRCLE ICON (Replacement for header star)
   Derived from public/image-circle.svg
   ============================================================ */
function ImageCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M22 12a9.966 9.966 0 0 1-.832 4M12 22a9.966 9.966 0 0 0 7.071-2.929M2 12a9.966 9.966 0 0 1 2.929-7.071M12 2a9.966 9.966 0 0 0-4 .832m0 18.336A10.02 10.02 0 0 1 2.832 16m13-13A10.02 10.02 0 0 1 21 8.168"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7.545 12.095a4.55 4.55 0 0 1 9.068-.54c-2.271.051-3.942.557-5.143 1.284 1.085.378 2.17 1.018 3.007 2.059a.75.75 0 0 1-1.169.94c-.79-.981-1.907-1.524-3.049-1.789a8.265 8.265 0 0 0-2.359-.19 4.535 4.535 0 0 1-.355-1.764zm4.55-6.36a6.36 6.36 0 1 0 0 12.72 6.36 6.36 0 0 0 0-12.72zm-1.909 3.087c-.224 0-.547.063-.83.267-.31.224-.534.592-.534 1.097s.223.873.534 1.097c.283.204.606.267.83.267.224 0 .547-.063.83-.267.311-.224.534-.592.534-1.097s-.223-.873-.534-1.097a1.459 1.459 0 0 0-.83-.267z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface UpscaleWorkspaceProps {
  items: UpscaleItem[];
  selectedId: string;
  onSelectId: (id: string) => void;
  onRemoveId: (id: string) => void;
  onAddFile: (file: File) => void;

  isLoading: boolean;
  /** 0–100 real progress of the in-flight neural model load (null when idle). */
  modelProgress?: number | null;

  onModelChange: (id: string, key: ModelKey) => void;
  onOptionsChange: (id: string, options: EnhancementOptions) => void;
  onResetSettings: (id: string) => void;

  onUpscale: (id: string) => void;
  /** Aborts the in-flight enhancement for the active item (Cancel button while processing). */
  onCancel?: (id: string) => void;
  onDownload: (id: string, format?: "png" | "webp" | "jpeg") => void;
  onReset?: () => void;

  /** MOBILE: opens the navigation sidebar drawer (hamburger icon, top-left) */
  onOpenMobileSidebar?: () => void;
  /** MOBILE: close the editor and return to the upscaler home (upload step) */
  onExitWorkspace?: () => void;
}

/* ============================================================
   DEFAULT ENHANCEMENT SETTINGS
   All advanced enhancement controls start at 50.
   ============================================================ */

const DEFAULT_ENHANCEMENT_SETTINGS = {
  sharpness: 50,
  denoise: 50,
  faceEnhancement: 50,
  colorLevel: 50,
  hdrLevel: 50,
  brightness: 50,
  contrast: 50,
};

/* ============================================================
   MODEL GLYPH ICONS (image-2 style tile icons)
   Simple monochrome glyphs rendered inside a rounded tile.
   ============================================================ */

function ModelGlyph({ model, className = "h-4.5 w-4.5" }: { model: ModelKey; className?: string }) {
  if (model === "vitality") {
    /* Crisp diagonal edges */
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.6" />
        <rect x="14" y="14" width="7" height="7" rx="1.6" />
        <rect x="12.5" y="8" width="4" height="4" rx="1" opacity="0.5" />
        <rect x="7.5" y="12" width="4" height="4" rx="1" opacity="0.5" />
      </svg>
    );
  }

  if (model === "pixel-dance") {
    /* Rising detail bars */
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <rect x="4" y="13.5" width="3.6" height="6.5" rx="1" opacity="0.55" />
        <rect x="10.2" y="9" width="3.6" height="11" rx="1" opacity="0.8" />
        <rect x="16.4" y="4" width="3.6" height="16" rx="1" />
      </svg>
    );
  }

  /* alpha-satoru — layered restoration stack */
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="14" width="7" height="7" rx="1.6" opacity="0.5" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.6" opacity="0.75" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
    </svg>
  );
}

interface ModelDropdownProps {
  selectedKey: ModelKey;
  onChange: (key: ModelKey) => void;
  disabled?: boolean;
}

function ModelDropdown({
  selectedKey,
  onChange,
  disabled,
}: ModelDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const MODEL_METADATA: Record<
    ModelKey,
    { label: string; full: string; desc: string; popular?: boolean }
  > = {
    vitality: {
      label: "Vitality",
      full: MODELS.vitality?.name || "Vitality",
      desc: "Fastest model, crisp clean edges.",
      popular: true,
    },
    'pixel-dance': {
      label: "Pixel-Dance",
      full: MODELS['pixel-dance']?.name || "Pixel-Dance",
      desc: "Max detail, up to 8K output.",
    },
    'alpha-satoru': {
      label: "Alpha-Satoru",
      full: MODELS['alpha-satoru']?.name || "Alpha-Satoru",
      desc: "Natural detail for portraits & photos.",
    },
  };

  const renderRow = (key: ModelKey, isSelected: boolean, onClick: () => void) => {
    const meta = MODEL_METADATA[key];

    return (
      <button
        key={key}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={onClick}
        className={`
          group flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors
          ${
            isSelected
              ? "bg-[#00FF85]/[0.08]"
              : "hover:bg-white/[0.05]"
          }
        `}
      >
        {/* ICON TILE */}
        <div
          className={`
            flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors
            ${
              isSelected
                ? "border-[#00FF85]/40 bg-[#00FF85]/15 text-[#00FF85]"
                : "border-white/10 bg-white/[0.05] text-white/85 group-hover:text-white"
            }
          `}
        >
          <ModelGlyph model={key} className="h-4 w-4" />
        </div>

        {/* NAME + SIMPLE 1-LINE DESCRIPTION */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-white" title={meta.full}>
            {meta.label}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-white/45">
            {meta.desc}
          </div>
        </div>

        {/* RIGHT: POPULAR TAG (top right) + CHECK */}
        {meta.popular && (
          <span className="shrink-0 rounded-md bg-[#C7FF00]/15 px-1.5 py-0.5 text-[9.5px] font-bold text-[#C7FF00]">
            Popular
          </span>
        )}
        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#00FF85]" />}
      </button>
    );
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all
          ${
            open
              ? "border-[#00FF85]/50 bg-[#16161c] shadow-[0_0_20px_rgba(0,255,133,0.12)]"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
          }
          ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
        `}
      >
        {/* ICON TILE */}
        <div
          className={`
            flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border
            ${
              selectedKey === "vitality"
                ? "border-[#00FF85]/40 bg-[#00FF85]/15 text-[#00FF85]"
                : "border-white/10 bg-white/[0.05] text-white/85"
            }
          `}
        >
          <ModelGlyph model={selectedKey} className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-white" title={MODEL_METADATA[selectedKey].full}>
            {MODEL_METADATA[selectedKey].label}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-white/45">
            {MODEL_METADATA[selectedKey].desc}
          </div>
        </div>

        {MODEL_METADATA[selectedKey].popular && (
          <span className="shrink-0 rounded-md bg-[#C7FF00]/15 px-1.5 py-0.5 text-[9.5px] font-bold text-[#C7FF00]">
            Popular
          </span>
        )}

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-200 ${
            open ? "rotate-180 text-[#00FF85]" : ""
          }`}
        />
      </button>

      {/* Popover Menu */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 flex flex-col gap-0.5 rounded-2xl border border-white/15 bg-[#141418] p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {(Object.keys(MODELS) as ModelKey[]).map((key) =>
            renderRow(key, key === selectedKey, () => {
              onChange(key);
              setOpen(false);
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN UPSCALE WORKSPACE
   ============================================================ */

export default function UpscaleWorkspace({
  items,
  selectedId,
  onSelectId,
  onRemoveId,
  onAddFile,
  isLoading,
  modelProgress,
  onModelChange,
  onOptionsChange,
  onResetSettings,
  onUpscale,
  onCancel,
  onDownload,
  onReset,
  onOpenMobileSidebar,
  onExitWorkspace,
}: UpscaleWorkspaceProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  const handleToggleSound = () => {
    primeAudio();
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playSuccessChime();
    }
  };

  const activeItem = items.find((i) => i.id === selectedId) || items[0];
  if (!activeItem) return null;

  // Viewport Zoom & Pan state
  const [viewportZoom, setViewportZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  // Reset zoom & pan when active item changes
  useEffect(() => {
    setViewportZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeItem?.id]);

  // Reset pan if zoom drops back to 1
  useEffect(() => {
    if (viewportZoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [viewportZoom]);

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewportZoom <= 1) return;
    if (e.button !== 0 && e.button !== 1) return;
    isPanningRef.current = true;
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
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    setPan({
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y,
    });
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
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

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setViewportZoom((z) =>
        Math.min(3, Math.max(0.5, Math.round((z + delta) * 100) / 100))
      );
    } else if (viewportZoom > 1) {
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  };

  // Stage header bar matching BGRemoveWorkspace style
  const stageHeaderBar = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 px-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-neutral-200 border border-slate-300/60 dark:border-white/10 font-bold truncate max-w-xs">
          📁 {activeItem?.name || "Untitled Image"}
        </span>
        {activeItem.status === "completed" && !!activeItem.result && (
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#00FF85]/15 text-[#00FF85] border border-[#00FF85]/30 font-bold shrink-0">
            ✓ Enhanced {activeItem?.options?.scale ? `${activeItem.options.scale}x` : ""}
          </span>
        )}
        {activeItem.status === "processing" && (
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-400/15 text-cyan-400 border border-cyan-400/30 font-bold shrink-0 animate-pulse">
            ⚡ Enhancing...
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#111319]/90 p-1 text-white shadow-lg backdrop-blur-xl shrink-0">
        <button
          type="button"
          onClick={() =>
            setViewportZoom((zoom) =>
              Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100)
            )
          }
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setViewportZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          aria-label="Reset zoom"
          title="Reset zoom"
          className="min-w-12 rounded-full px-2 py-1.5 text-xs font-bold tabular-nums transition hover:bg-white/10 cursor-pointer text-center"
        >
          {Math.round(viewportZoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() =>
            setViewportZoom((zoom) =>
              Math.min(3, Math.round((zoom + 0.25) * 100) / 100)
            )
          }
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-white/15" />
        <button
          type="button"
          onClick={() => {
            setViewportZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          aria-label="Reset zoom"
          title="Reset zoom"
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const isProcessing = activeItem.status === "processing";
  const hasResult = activeItem.status === "completed" && !!activeItem.result;
  const resultUrl = activeItem.result?.dataUrl || "";
  const imageUrl = activeItem.url;
  const modelKey = activeItem.modelKey;
  const options = activeItem.options;
  const busy = isProcessing || isLoading;
  const model = MODELS[modelKey];

  /* ----------------------------------------------------------
     RESET ADVANCED SETTINGS
     ---------------------------------------------------------- */
  const resetEnhancementSettings = () => {
    if (busy) return;
    onResetSettings(activeItem.id);
  };

  /* ----------------------------------------------------------
     SCALE SELECTION
     ---------------------------------------------------------- */
  const selectScale = (scale: ScaleFactor) => {
    if (busy) return;

    onOptionsChange(activeItem.id, {
      ...options,
      scale,
    });
  };

  /* ----------------------------------------------------------
     CANCEL PROCESSING → aborts the in-flight upscale run
     ---------------------------------------------------------- */
  const handleCancelProcessing = () => {
    if (isProcessing && onCancel) {
      onCancel(activeItem.id);
    }
  };

  /* ----------------------------------------------------------
     MOBILE: CANCEL (X) → back to the upscaler home
     ---------------------------------------------------------- */
  const handleExitWorkspace = () => {
    if (onExitWorkspace) {
      onExitWorkspace();
    } else {
      onReset?.();
    }
  };

  /* ----------------------------------------------------------
     SHARED ADVANCED CONTROLS (presets + sliders)
     Rendered inside the desktop collapsible and — on mobile —
     inside the scrollable advanced view of the same card.
     ---------------------------------------------------------- */
  const advancedControls = (
    <>
      {/* Presets — each preset applies real enhancement values. Moving any
          slider manually clears the active preset selection. */}
      {model?.presets && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-white/50">
              Preset
            </div>
            {options.preset && (
              <span className="rounded-full bg-[#00FF85]/10 border border-[#00FF85]/25 px-2 py-0.5 text-[10px] font-semibold text-[#00FF85]">
                {options.preset}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {model.presets.map((p: string) => {
              const active = options.preset === p;

              return (
                <button
                  key={p}
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() =>
                    onOptionsChange(
                      activeItem.id,
                      buildPresetOptions(modelKey, p, options)
                    )
                  }
                  className={`
                    rounded-lg
                    px-3
                    py-1.5
                    text-xs
                    font-medium
                    transition-all
                    disabled:opacity-30
                    cursor-pointer
                    ${
                      active
                        ? "border border-[#00FF85]/50 bg-[#00FF85]/15 text-[#00FF85] font-semibold shadow-[0_0_12px_rgba(0,255,133,0.12)]"
                        : "border border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }
                  `}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sliders with disabled={busy} and fixed tooltips.
          Moving a slider clears the active preset (custom tuning). */}
      <ParameterSlider
        label="Sharpness"
        value={options.sharpness ?? options.sharpenLevel ?? 50}
        min={0}
        max={100}
        disabled={busy}
        onChange={(value) => onOptionsChange(activeItem.id, { ...options, preset: undefined, sharpness: value, sharpenLevel: value, sharpen: true })}
        info="Controls how strongly fine edges and details are enhanced."
      />

      <ParameterSlider
        label="Denoise"
        value={options.denoise ?? options.removeNoiseLevel ?? 50}
        min={0}
        max={100}
        disabled={busy}
        onChange={(value) => onOptionsChange(activeItem.id, { ...options, preset: undefined, denoise: value, removeNoiseLevel: value, removeNoise: true })}
        info="Reduces noise, grain and compression artifacts."
      />

      {model?.features?.faceRestore && (
        <ParameterSlider
          label="Face enhancement"
          value={options.faceEnhancement ?? options.faceRestoreLevel ?? 50}
          min={0}
          max={100}
          disabled={busy}
          onChange={(value) => onOptionsChange(activeItem.id, { ...options, preset: undefined, faceEnhancement: value, faceRestoreLevel: value, faceRestore: true } as EnhancementOptions)}
          info="Controls the strength of facial detail restoration."
        />
      )}

      {model?.features?.colorEnhance && (
        <ParameterSlider
          label="Color enhancement"
          value={options.colorLevel ?? 50}
          min={0}
          max={100}
          disabled={busy}
          onChange={(value) => onOptionsChange(activeItem.id, { ...options, preset: undefined, colorLevel: value, colorEnhance: value !== 50 } as EnhancementOptions)}
          info="Enhances color richness, vibrancy and overall color balance."
        />
      )}

      {model?.features?.hdrBoost && (
        <ParameterSlider
          label="HDR"
          value={options.hdrLevel ?? 50}
          min={0}
          max={100}
          disabled={busy}
          onChange={(value) => onOptionsChange(activeItem.id, { ...options, preset: undefined, hdrLevel: value, hdrBoost: value !== 50 } as EnhancementOptions)}
          info="Enhances dynamic range, highlights and shadow details."
        />
      )}

      <ParameterSlider
        label="Brightness"
        value={options.brightness ?? 50}
        min={0}
        max={100}
        disabled={busy}
        onChange={(value) => onOptionsChange(activeItem.id, { ...options, preset: undefined, brightness: value } as EnhancementOptions)}
        info="Adjusts the overall brightness of the image."
      />

      <ParameterSlider
        label="Contrast"
        value={options.contrast ?? 50}
        min={0}
        max={100}
        disabled={busy}
        onChange={(value) => onOptionsChange(activeItem.id, { ...options, preset: undefined, contrast: value } as EnhancementOptions)}
        info="Controls the difference between light and dark areas."
      />
    </>
  );

  /* ----------------------------------------------------------
     MOBILE: ADVANCED SETTINGS TOGGLE ROW (label left, icon right
     — matches the reference design). Toggles between the basic
     controls (Model / Scale factor) and the advanced sliders.
     ---------------------------------------------------------- */
  const advancedToggleRow = (
    <button
      type="button"
      onClick={() => setAdvancedOpen((v) => !v)}
      disabled={busy}
      aria-expanded={advancedOpen}
      className={`
        flex
        w-full
        items-center
        justify-between
        rounded-xl
        border
        p-3.5
        text-left
        text-sm
        font-semibold
        transition-colors
        cursor-pointer
        disabled:opacity-40
        ${
          advancedOpen
            ? "border-[#00FF85]/40 bg-[#00FF85]/10 text-white"
            : "border-white/[0.08] bg-white/[0.02] text-white/90 hover:bg-white/[0.05]"
        }
      `}
    >
      <span>Advanced Settings</span>

      <SlidersHorizontal
        className={`h-4 w-4 ${advancedOpen ? "text-[#00FF85]" : "text-white/60"}`}
      />
    </button>
  );

  /* ----------------------------------------------------------
     SHARED PRIMARY ACTION BUTTON — identical on mobile and desktop
     (idle → "Upscale {scale}x" · completed → "Download Result").
     While processing, the same row gains a Cancel button next to
     the disabled Enhancing… button.
     ---------------------------------------------------------- */
  const actionArea = (
    <div className="shrink-0">
      {hasResult ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDownload(activeItem.id, "png")}
            className="
              flex flex-1 cursor-pointer items-center justify-center gap-2
              rounded-xl bg-[#00FF85] px-4 py-3 text-sm font-bold text-black
              shadow-[0_10px_30px_rgba(0,255,133,0.25)]
              transition-all duration-200 hover:bg-[#00E599] active:scale-[0.98]
            "
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={() => onUpscale(activeItem.id)}
            disabled={busy}
            title="Run the enhancement again"
            className="
              flex cursor-pointer items-center justify-center gap-2 rounded-xl
              border border-white/15 bg-white/[0.06] px-4 py-3 text-sm
              font-semibold text-white transition-all duration-200
              hover:bg-white/[0.12] active:scale-[0.98] disabled:opacity-30
            "
          >
            <RotateCcw className="h-4 w-4" />
            <span>Re-enhance</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpscale(activeItem.id)}
            disabled={busy}
            className="
              flex flex-1 cursor-pointer items-center justify-center gap-2
              rounded-xl bg-[#00FF85] px-5 py-3 text-sm font-bold text-black
              shadow-[0_10px_30px_rgba(0,255,133,0.25)]
              transition-all duration-200 hover:bg-[#00E599]
              active:scale-[0.98] disabled:cursor-wait disabled:opacity-40
            "
          >
            <ImageCircleIcon className="h-5 w-5 text-black" />
            <span>{busy ? "Enhancing…" : `Upscale ${options.scale}x`}</span>
          </button>

          {isProcessing && (
            <button
              type="button"
              onClick={handleCancelProcessing}
              title="Cancel the current enhancement"
              className="
                flex cursor-pointer items-center justify-center gap-1.5 rounded-xl
                border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm
                font-semibold text-red-300 transition-all duration-200
                hover:bg-red-500/20 hover:text-red-200 active:scale-[0.98]
              "
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ========================================================
          MOBILE LAYOUT (< lg): full-screen fixed view — image on
          top (fixed height), adjustment card below (fills the rest).
          No page scrolling; only the advanced sliders scroll inside
          the card.
         ======================================================== */}
      <div className="lg:hidden fixed inset-0 z-40 flex w-full flex-col overflow-hidden bg-[#0a0a0c]">
        {/* TOP BAR: sidebar menu (left) · cancel (right) */}
        <div className="flex h-14 w-full shrink-0 items-center justify-between px-3">
          {/* SIDEBAR MENU ICON (replaces the "Upscale" heading on mobile) */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="
              flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center
              rounded-full border border-white/15 bg-white/[0.06] text-white
              transition-all active:scale-95
            "
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* CANCEL → back to the upscaler home */}
            <button
              type="button"
              onClick={handleExitWorkspace}
              title="Back to upscaler home"
              aria-label="Close and return to upscaler home"
              className="
                flex h-10 w-10 cursor-pointer items-center justify-center rounded-full
                border border-white/15 bg-white/[0.06] text-white
                transition-all active:scale-95 hover:bg-white/[0.12]
              "
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* STAGE HEADER BAR */}
        <div className="w-full shrink-0 px-3 pb-2">
          {stageHeaderBar}
        </div>

        {/* IMAGE SHOWCASE — FIXED HEIGHT */}
        <div className="w-full shrink-0 px-3">
          <div
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            onWheel={handleStageWheel}
            className={`relative h-[40vh] max-h-[480px] min-h-[210px] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070709] shadow-2xl isolate select-none ${
              viewportZoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            {/* Authentic stage canvas */}

            <div
              className={`relative flex h-full w-full items-center justify-center origin-center ${
                isPanning ? 'transition-none' : 'transition-transform duration-150'
              }`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${viewportZoom})`,
              }}
            >
              {hasResult && resultUrl ? (
                <BeforeAfterSlider
                  before={imageUrl}
                  after={resultUrl}
                  isZoomed={viewportZoom > 1}
                  onStartPan={handleStagePointerDown}
                />
              ) : (
                <div className="relative flex h-full w-full items-center justify-center pointer-events-none">
                  <img
                    src={imageUrl}
                    alt={activeItem.name || "Uploaded preview"}
                    className="
                      block
                      h-full
                      w-full
                      object-contain
                      select-none
                    "
                    draggable={false}
                  />
                </div>
              )}
            </div>

            {/* SOLVING ORB PROCESSING OVERLAY */}
            {isProcessing && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-black/45 backdrop-blur-[3px]">
                <div className="relative z-20 flex flex-col items-center gap-3 px-8 py-6 text-center">
                  <UpscalerLoader />

                  {/* LIVE PERCENTAGE */}
                  <div className="font-mono text-3xl font-black tabular-nums tracking-tight text-white">
                    {Math.min(100, Math.max(0, Math.round(activeItem.progress?.percent ?? 0)))}
                    <span className="text-lg font-bold text-[#00FF85]">%</span>
                  </div>

                  <div className="max-w-[240px] truncate text-sm font-bold tracking-wide text-white">
                    Enhancing {activeItem.name}
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-[#00FF85]/30 bg-[#00FF85]/10 px-3 py-1 text-[9px] font-semibold text-[#00FF85]">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#00FF85]" />
                    <span>Neural Super-Resolution Active</span>
                  </div>
                </div>
              </div>
            )}

            {/* MODEL LOADING OVERLAY — shown while the neural model downloads/compiles */}
            {isLoading && !isProcessing && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 overflow-hidden bg-black/55 backdrop-blur-[3px]">
                <div className="flex w-[70%] max-w-[380px] justify-center">
                  <ModelLoader progress={modelProgress} />
                </div>
                <div className="text-sm font-bold tracking-wide text-white">
                  Loading AI model...
                </div>
                <div className="max-w-[240px] text-center text-[11px] text-white/50">
                  The neural model downloads once, then runs from your browser cache.
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ADJUSTMENTS CARD — fills the remaining height, no page scrolling */}
        <div className="flex w-full min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.08] bg-[#121216] p-4 shadow-2xl">
            {/* INLINE ERROR */}
            {activeItem.status === "error" && activeItem.error && (
              <div className="mb-3 shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-300">
                {activeItem.error}
              </div>
            )}

            {!advancedOpen ? (
              /* ---------- BASIC: Model + Scale factor ---------- */
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {/* MODEL */}
                <div className="shrink-0">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    Model
                  </div>

                  <ModelDropdown
                    selectedKey={modelKey}
                    onChange={(key) => onModelChange(activeItem.id, key)}
                    disabled={busy}
                  />
                </div>

                {/* SCALE FACTOR */}
                <div className="mt-4 shrink-0">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    Scale factor
                  </div>

                  <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
                    {[2, 4, 8].map((s) => {
                      if (s === 8 && model?.maxScale && model.maxScale < 8) {
                        return null;
                      }

                      const active = options.scale === (s as ScaleFactor);

                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => selectScale(s as ScaleFactor)}
                          disabled={busy}
                          className={`
                            flex-1
                            rounded-xl
                            py-2.5
                            text-sm
                            font-bold
                            transition-all
                            ${
                              active
                                ? "bg-white text-black shadow-lg"
                                : "text-white/60 hover:text-white"
                            }
                            disabled:opacity-30
                          `}
                        >
                          {s}x
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ADVANCED SETTINGS + ACTION — pinned to the bottom of the card */}
                <div className="mt-auto shrink-0 pt-4">
                  {advancedToggleRow}
                  <div className="pt-3" />
                  {actionArea}
                </div>
              </div>
            ) : (
              /* ---------- ADVANCED: sliders replace the basic controls (scrollable) ---------- */
              <>
                {/* HEADER ROW: label + Reset (matches the desktop panel header) */}
                <div className="flex shrink-0 items-center justify-between pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Advanced
                  </span>

                  <button
                    type="button"
                    onClick={resetEnhancementSettings}
                    disabled={busy}
                    title="Reset enhancement controls to defaults"
                    className="
                      flex cursor-pointer items-center gap-1.5 rounded-lg border
                      border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs
                      font-medium text-white/60 transition-colors
                      hover:bg-white/[0.06] hover:text-white disabled:opacity-30
                    "
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                  {advancedControls}
                </div>

                <div className="shrink-0 pt-3">
                  {advancedToggleRow}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          DESKTOP LAYOUT (lg+): unchanged two-column workspace
         ======================================================== */}
      <div className="hidden lg:flex lg:flex-row w-full gap-6 items-start">
      {/* ======================================================
          LEFT SECTION: IMAGE CANVAS + INDIVIDUAL ADD/THUMB STRIP BELOW (Req 5 & 6)
         ====================================================== */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
        {/* STAGE HEADER BAR */}
        {stageHeaderBar}

        {/* 5. IMAGE SHOWCASE DIV (Big, properly fits uploaded image in view) */}
        <div
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          onPointerCancel={handleStagePointerUp}
          onWheel={handleStageWheel}
          className={`relative w-full h-[620px] lg:h-[760px] max-h-[82vh] rounded-2xl border border-white/[0.08] bg-[#070709] flex items-center justify-center overflow-hidden p-3 sm:p-6 shadow-2xl isolate select-none ${
            viewportZoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
          }`}
        >
          {/* Authentic stage canvas */}

          <div
            className={`relative flex h-full w-full items-center justify-center origin-center ${
              isPanning ? 'transition-none' : 'transition-transform duration-150'
            }`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${viewportZoom})`,
            }}
          >
            {hasResult && resultUrl ? (
              <BeforeAfterSlider
                before={imageUrl}
                after={resultUrl}
                isZoomed={viewportZoom > 1}
                onStartPan={handleStagePointerDown}
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center pointer-events-none">
                <img
                  src={imageUrl}
                  alt={activeItem.name || "Uploaded preview"}
                  className="
                    block
                    h-full
                    w-full
                    object-contain
                    select-none
                  "
                  draggable={false}
                />
              </div>
            )}
          </div>

          {/* SOLVING ORB PROCESSING OVERLAY — progress ring + solving orb + % (no tiles/steps) */}
          {isProcessing && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden rounded-2xl bg-black/45 backdrop-blur-[3px]">
              <div className="relative z-20 flex flex-col items-center gap-4 rounded-3x px-10 py-8 text-center">
                {/* Determinate ring: real % from the inference pipeline, mint variant.
                    state="connecting": we don't use SolvingOrb's locked 'solving' —
                    we render OrbProgressRing directly via the exported component's
                    state override below (connecting = pulsing handshake). */}
                {/* <SolvingOrb
                  size={160}
                  variant="mint"
                  loop={false}
                  progress={Math.min(1, Math.max(0.03, (activeItem.progress?.percent ?? 0) / 100))}
                  stateOverride="connecting"
                /> */}

                <UpscalerLoader/>

                {/* LIVE PERCENTAGE */}
                <div className="font-mono text-4xl font-black tabular-nums tracking-tight text-white">
                  {Math.min(100, Math.max(0, Math.round(activeItem.progress?.percent ?? 0)))}
                  <span className="text-xl font-bold text-[#00FF85]">%</span>
                </div>

                <div className="max-w-[280px] truncate text-base font-bold tracking-wide text-white">
                  Enhancing {activeItem.name}
                </div>

                {/* Rotating status caption — band-matched to real progress */}
                <WaitCaption
                  percent={activeItem.progress?.percent ?? 0}
                  isDownload={activeItem.progress?.stepIndex === 1}
                />

                <div className="flex items-center gap-2 rounded-full border border-[#00FF85]/30 bg-[#00FF85]/10 px-3.5 py-1 text-[10px] font-semibold text-[#00FF85]">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#00FF85]" />
                  <span>Neural Super-Resolution Active</span>
                </div>
              </div>
            </div>
          )}

          {/* MODEL LOADING OVERLAY — shown while the neural model downloads/compiles */}
          {isLoading && !isProcessing && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 overflow-hidden bg-black/55 backdrop-blur-[3px]">
              <div className="flex w-[70%] max-w-[380px] justify-center">
                <ModelLoader progress={modelProgress} />
              </div>
              <div className="text-sm font-bold tracking-wide text-white">
                Loading AI model...
              </div>
              <div className="max-w-[260px] text-center text-[11px] text-white/50">
                The neural model downloads once, then runs from your browser cache.
              </div>
            </div>
          )}
        </div>

        {/* 6. INDIVIDUAL '+ ADD' SECTION (Stays still & in middle of image below section) */}
        <div className="w-full flex items-center justify-center py-1">
          <UploadStrip
            items={items}
            selectedId={activeItem.id}
            onSelectId={onSelectId}
            onRemoveId={onRemoveId}
            onAddFile={onAddFile}
          />
        </div>
      </div>

      {/* ======================================================
          4. RIGHT CONTROL PANEL (Separate container on right)
         ====================================================== */}
      <aside
        className="
          w-full
          lg:w-[410px]
          shrink-0
          rounded-2xl
          border
          border-white/[0.08]
          bg-[#121216]
          p-5
          sm:p-6
          shadow-2xl
          flex
          flex-col
          gap-6
          sticky
          top-24
          max-h-[calc(100vh-120px)]
          overflow-y-auto
        "
      >
        {/* HEADER (With image-circle.svg icon to the left of Upscale) */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center">
              <Images className="h-7 w-7 text-[#00FF85]" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-wide">
                Upscale
              </div>
              <div className="text-[11px] text-white/45">
                AI Resolution & Details
              </div>
            </div>
          </div>

          {/* ACTIONS: SOUND TOGGLE + RESET */}
          <div className="flex items-center gap-1.5">
            {/* SOUND EFFECT TOGGLE */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={soundOn ? "Sound chime enabled (click to mute)" : "Sound chime muted (click to enable)"}
              className={`
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                border
                transition-all
                cursor-pointer
                ${
                  soundOn
                    ? "border-[#00FF85]/40 bg-[#00FF85]/10 text-[#00FF85] shadow-[0_0_10px_rgba(0,255,133,0.15)]"
                    : "border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white"
                }
              `}
              aria-label="Toggle sound effect"
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            {/* RESET BUTTON */}
            <button
              type="button"
              onClick={resetEnhancementSettings}
              disabled={busy}
              title="Reset enhancement controls to 50"
              className="
                flex
                items-center
                gap-1.5
                rounded-lg
                border
                border-white/10
                bg-white/[0.03]
                px-2.5
                py-1.5
                text-xs
                font-medium
                text-white/60
                transition-colors
                hover:bg-white/[0.06]
                hover:text-white
                disabled:opacity-30
                cursor-pointer
              "
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* 2. MODEL SELECTION (Custom Dropdown with 1-line description) */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Model
          </div>

          <ModelDropdown
            selectedKey={modelKey}
            onChange={(key) => onModelChange(activeItem.id, key)}
            disabled={busy}
          />
        </div>

        {/* SCALE FACTOR */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Scale factor
          </div>

          <div className="flex gap-2">
            {[2, 4, 8].map((s) => {
              if (s === 8 && model?.maxScale && model.maxScale < 8) {
                return null;
              }

              const active = options.scale === (s as ScaleFactor);

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectScale(s as ScaleFactor)}
                  disabled={busy}
                  className={`
                    flex-1
                    rounded-xl
                    py-2.5
                    text-sm
                    font-bold
                    transition-all
                    ${
                      active
                        ? "bg-white text-black shadow-lg"
                        : "bg-white/[0.03] border border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white"
                    }
                    disabled:opacity-30
                  `}
                >
                  {s}x
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. ADVANCED SETTINGS (Disabled when busy, Requirement 7 & 9) */}
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            disabled={busy}
            className="
              flex
              w-full
              items-center
              justify-between
              rounded-xl
              border
              border-white/[0.08]
              bg-white/[0.02]
              p-3.5
              text-left
              text-sm
              font-semibold
              text-white/90
              transition-colors
              hover:bg-white/[0.05]
              disabled:opacity-40
            "
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#00FF85]" />
              <span>Advanced Settings</span>
            </div>

            <ChevronDown
              className={`
                h-4
                w-4
                text-white/50
                transition-transform
                duration-200
                ${advancedOpen ? "rotate-180 text-[#00FF85]" : ""}
              `}
            />
          </button>

          {advancedOpen && (
            <div className={`mt-4 space-y-5 rounded-xl border border-white/[0.06] bg-black/20 p-4 transition-opacity ${busy ? "opacity-50 pointer-events-none" : ""}`}>
              {advancedControls}
            </div>
          )}
        </div>

        {/* 3. ACTIONS (Upscale & Download Buttons with brand mint color) */}
        <div className="mt-auto pt-4 border-t border-white/[0.08]">
          {actionArea}
        </div>
      </aside>
      </div>
    </>
  );
}

/* ============================================================
   BEFORE / AFTER SLIDER

   LEFT  = ORIGINAL / OLD
   RIGHT = UPSCALED / NEW

   The images remain exactly the same size.
   Only the visible portion of the original changes.
   ============================================================ */

function BeforeAfterSlider({
  before,
  after,
  isZoomed = false,
  onStartPan,
}: {
  before: string;
  after: string;
  isZoomed?: boolean;
  onStartPan?: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(50);
  const draggingRef = useRef(false);

  /* ----------------------------------------------------------
     Update slider position
     ---------------------------------------------------------- */
  const updatePosition = (clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width) return;
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, percentage)));
  };

  /* ----------------------------------------------------------
     Global pointer movement
     ---------------------------------------------------------- */
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      updatePosition(e.clientX);
    };

    const handlePointerUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  });

  /* ----------------------------------------------------------
     Start dragging
     ---------------------------------------------------------- */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const dividerX = (pos / 100) * rect.width;
    const dist = Math.abs(clickX - dividerX);

    // If zoomed and not clicking near the divider/handle, delegate to panning
    if (isZoomed && dist > 40) {
      onStartPan?.(e);
      return;
    }

    e.preventDefault();
    draggingRef.current = true;
    updatePosition(e.clientX);
  };

  /* ----------------------------------------------------------
     Keyboard support
     ---------------------------------------------------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next = pos;
    switch (e.key) {
      case "ArrowLeft":
        next = Math.max(0, pos - 2);
        break;
      case "ArrowRight":
        next = Math.min(100, pos + 2);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    e.preventDefault();
    setPos(next);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={`
        relative
        h-full
        w-full
        overflow-hidden
        rounded-xl
        touch-none
        select-none
        ${isZoomed ? "cursor-default" : "cursor-ew-resize"}
      `}
    >
      <div className="relative h-full w-full flex items-center justify-center">
        {/* NEW / UPSCALED IMAGE */}
        <img
          src={after}
          alt="Enhanced result"
          draggable={false}
          className="block h-full w-full object-contain select-none"
        />

        {/* OLD / ORIGINAL IMAGE */}
        <img
          src={before}
          alt="Original"
          draggable={false}
          className="absolute inset-0 block h-full w-full object-contain select-none"
          style={{
            clipPath: `inset(0 ${100 - pos}% 0 0)`,
          }}
        />

        {/* SLIDER LINE */}
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,.5)]"
          style={{
            left: `${pos}%`,
          }}
        >
          {/* HIT AREA FOR SLIDER DRAGGING WHEN ZOOMED */}
          <div
            className="absolute inset-y-0 -left-6 -right-6 pointer-events-auto cursor-ew-resize"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              draggingRef.current = true;
              updatePosition(e.clientX);
            }}
          />

          {/* HANDLE */}
          <div
            className="absolute left-1/2 top-1/2 flex h-[48px] w-[48px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] bg-white shadow-[0_8px_30px_rgba(0,0,0,.4)] pointer-events-auto cursor-ew-resize"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              draggingRef.current = true;
              updatePosition(e.clientX);
            }}
          >
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
      </div>

      {/* ORIGINAL LABEL */}
      <div className="pointer-events-none absolute left-3 top-3 z-30 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
        Original
      </div>

      {/* ENHANCED LABEL */}
      <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
        Enhanced
      </div>

      {/* =====================================================
          ACCESSIBLE SLIDER

          Invisible interaction layer over divider.
         ===================================================== */}

      <div
        role="slider"
        aria-label="Before and after comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="
          absolute
          inset-y-0
          z-40
          w-4
          -translate-x-1/2
          outline-none
        "
        style={{
          left: `${pos}%`,
        }}
      />
    </div>
  );
}

/* ============================================================
   RANGE CONTROL

   Kept here for compatibility with the existing workspace.
   The advanced settings currently use ParameterSlider instead.
   ============================================================ */

function RangeControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-white/70">
        <div>{label}</div>

        <div className="font-semibold">
          {value}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(
            Number(e.target.value)
          )
        }
        className="
          mt-2
          w-full
          accent-[#C7FF00]
        "
      />
    </div>
  );
}

/* ============================================================
   TOGGLE

   Kept for compatibility with existing code.
   ============================================================ */

function ToggleRow({
  label,
  enabled,
  onClick,
  disabled,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-white/80">
        {label}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={enabled}
        className={`
          h-7
          w-12
          rounded-full
          p-1
          transition-all

          ${
            enabled
              ? "bg-[#C7FF00]"
              : "bg-white/[0.06]"
          }

          disabled:opacity-30
        `}
      >
        <div
          className={`
            h-5
            w-5
            rounded-full
            bg-black
            transition-transform
            duration-200

            ${
              enabled
                ? "translate-x-5"
                : "translate-x-0"
            }
          `}
        />
      </button>
    </div>
  );
}

/* ============================================================
   UPLOAD STRIP
   ============================================================ */

interface UploadStripProps {
  items: UpscaleItem[];
  selectedId: string;
  onSelectId: (id: string) => void;
  onRemoveId: (id: string) => void;
  onAddFile: (file: File) => void;
}

function UploadStrip({
  items,
  selectedId,
  onSelectId,
  onRemoveId,
  onAddFile,
}: UploadStripProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* ----------------------------------------------------------
     Open file picker
     ---------------------------------------------------------- */
  const handleClick = () => {
    inputRef.current?.click();
  };

  /* ----------------------------------------------------------
     New file(s)
     ---------------------------------------------------------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        onAddFile(files[i]);
      }
    }
    e.target.value = "";
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* FILE INPUT */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex items-center justify-center gap-3 px-4 py-1.5 max-w-full overflow-x-auto rounded-2xl bg-[#0c0c10]/70 backdrop-blur-xl shadow-lg">
        {/* ==================================================
            ADD BUTTON - Stays still in the middle / anchor
           ================================================== */}
        <button
          type="button"
          onClick={handleClick}
          title="Add another image"
          className="
            flex
            h-[68px]
            w-[68px]
            shrink-0
            flex-col
            items-center
            justify-center
            rounded-xl
            border
            border-dashed
            border-white/20
            bg-white/[0.03]
            text-white/70
            transition-all
            hover:border-[#00FF85]
            hover:bg-[#00FF85]/10
            hover:text-[#00FF85]
            hover:scale-[1.03]
            cursor-pointer
            group
          "
        >
          <span className="text-2xl leading-none font-light group-hover:scale-110 transition-transform">
            +
          </span>
          <span className="mt-1 text-[10.5px] font-bold tracking-wider uppercase">
            Add
          </span>
        </button>

        {/* ==================================================
            THUMBNAILS
           ================================================== */}
        {items.length > 0 && (
          <div className="flex items-center gap-2.5 py-1 overflow-x-auto px-2 ">
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const isProcessing = item.status === "processing";
              const isCompleted = item.status === "completed";
              const isError = item.status === "error";

              return (
                <div key={item.id} className="relative shrink-0 group">
                  <div
                    onClick={() => onSelectId(item.id)}
                    className={`
                      relative
                      h-[68px]
                      w-[68px]
                      cursor-pointer
                      rounded-xl
                      overflow-hidden
                      transition-all
                      ${
                        isSelected
                          ? "border-2 border-[#00FF85] shadow-[0_0_14px_rgba(0,255,133,0.35)] scale-[1.02]"
                          : "border border-white/10 opacity-70 hover:opacity-100 hover:border-white/30"
                      }
                    `}
                  >
                    <img
                      src={item.url}
                      className="h-full w-full object-cover select-none bg-[#13141b]"
                      alt={item.name}
                      draggable={false}
                    />

                    {/* PROCESSING BADGE / SPINNER */}
                    {isProcessing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[1px]">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00FF85]/30 border-t-[#00FF85]" />
                        <span className="mt-1 text-[8px] font-bold text-[#00FF85] tracking-wider uppercase">
                          AI
                        </span>
                      </div>
                    )}

                    {/* COMPLETED BADGE */}
                    {isCompleted && (
                      <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00FF85] text-black shadow-md">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* ERROR BADGE */}
                    {isError && (
                      <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white font-bold text-[9px] shadow-md">
                        !
                      </div>
                    )}
                  </div>

                  {/* REMOVE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveId(item.id);
                    }}
                    className="
                      absolute
                      -right-1.5
                      -top-1.5
                      flex
                      h-5
                      w-5
                      items-center
                      justify-center
                      rounded-full
                      bg-black/90
                      border border-white/20
                      text-xs
                      text-white/80
                      opacity-0
                      group-hover:opacity-100
                      transition-all
                      hover:bg-red-500
                      hover:text-white
                      z-10
                    "
                    aria-label={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}