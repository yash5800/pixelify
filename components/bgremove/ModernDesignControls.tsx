import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Check,
  Upload,
  Search,
  Sparkles,
  Trash2,
  Copy,
  Plus,
  Minus,
} from 'lucide-react';
import type { TextLayer, ElementLayer, FontPreset } from './DesignAssets';
import { COLOR_PALETTE } from './DesignAssets';

const FONT_SIZE_PRESETS = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 144, 180, 240, 320, 480, 720, 1000,
];

// ============================================================================
// 1. FONT SIZE STEPPER WITH HOLD-TO-REPEAT (RANGE 1 - 1000)
// ============================================================================
export interface FontSizeControlProps {
  value: number;
  onChange: (newSize: number) => void;
}

export function FontSizeControl({ value, onChange }: FontSizeControlProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const safeValue = Math.max(1, Math.min(1000, Math.round(value || 32)));

  const valueRef = useRef(safeValue);
  valueRef.current = safeValue;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoldingRef = useRef(false);

  const stopRepeat = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isHoldingRef.current = false;
  };

  useEffect(() => {
    return () => {
      stopRepeat();
    };
  }, []);

  const step = (delta: number) => {
    const next = Math.max(1, Math.min(1000, valueRef.current + delta));
    valueRef.current = next;
    onChangeRef.current(next);
  };

  const handlePointerDown = (delta: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    stopRepeat();
    isHoldingRef.current = true;

    // 1. Immediate single step on press
    step(delta);

    // 2. Start repeating only if held down for more than 350ms
    let count = 0;
    timerRef.current = setTimeout(() => {
      if (!isHoldingRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!isHoldingRef.current) {
          stopRepeat();
          return;
        }
        count++;
        const acceleration = count > 25 ? 5 : count > 10 ? 2 : 1;
        step(delta * acceleration);
      }, 50);
    }, 350);
  };

  const buttonHandlers = (delta: number) => ({
    onPointerDown: handlePointerDown(delta),
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerCancel: stopRepeat,
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <div className="relative flex items-center rounded-xl border border-slate-300 bg-white p-1 dark:border-white/15 dark:bg-[#111319]" ref={dropdownRef}>
      {/* Decrease Button with Hold-to-repeat */}
      <button
        type="button"
        {...buttonHandlers(-1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 active:scale-95 active:bg-[#00FF85]/20 dark:text-white/80 dark:hover:bg-white/10"
        title="Decrease font size by 1 (hold to rapidly decrease)"
        aria-label="Decrease font size"
      >
        <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
      </button>

      {/* Numerical Direct Input */}
      <div className="flex items-center px-1">
        <input
          type="number"
          min={1}
          max={1000}
          value={safeValue}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            if (!isNaN(parsed)) {
              onChange(Math.max(1, Math.min(1000, parsed)));
            }
          }}
          className="w-12 bg-transparent text-center font-mono text-xs font-black text-slate-900 outline-none dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          title="Directly enter font size (1 - 1000)"
          aria-label="Font size value"
        />
        <span className="text-[10px] font-bold text-slate-400 dark:text-white/40">px</span>
      </div>

      {/* Preset Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex h-7 w-5 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/10"
        title="Choose from preset font sizes"
        aria-label="Font size presets"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Increase Button with Hold-to-repeat */}
      <button
        type="button"
        {...buttonHandlers(1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 active:scale-95 active:bg-[#00FF85]/20 dark:text-white/80 dark:hover:bg-white/10"
        title="Increase font size by 1 (hold to rapidly increase)"
        aria-label="Increase font size"
      >
        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
      </button>

      {/* Presets Popover Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-56 w-36 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-1 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-[#12131A]/95">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
            Presets (1 - 1000)
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {FONT_SIZE_PRESETS.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  onChange(sz);
                  setIsDropdownOpen(false);
                }}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                  safeValue === sz
                    ? 'bg-[#00FF85] text-[#050507]'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/10'
                }`}
              >
                <span>{sz}px</span>
                {safeValue === sz && <Check className="h-3 w-3 stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. MODERN FONT PICKER DROPDOWN (PREVIEWS + SEARCH + UPLOAD)
// ============================================================================
export interface ModernFontPickerProps {
  selectedFontId: string;
  fonts: FontPreset[];
  onSelectFont: (fontId: string) => void;
  onUploadClick: () => void;
}

export function ModernFontPicker({
  selectedFontId,
  fonts,
  onSelectFont,
  onUploadClick,
}: ModernFontPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentPreset = useMemo(
    () => fonts.find((f) => f.id === selectedFontId) || fonts[0],
    [fonts, selectedFontId]
  );

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'sans', label: 'Sans' },
    { id: 'serif', label: 'Serif' },
    { id: 'display', label: 'Display' },
    { id: 'script', label: 'Script' },
    { id: 'mono', label: 'Mono' },
    { id: 'custom', label: 'Uploaded' },
  ];

  const filteredFonts = useMemo(() => {
    return fonts.filter((f) => {
      const matchesCategory =
        activeCategory === 'all' ||
        (activeCategory === 'custom' ? f.isCustom : f.category === activeCategory);
      const matchesSearch =
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [fonts, activeCategory, searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left transition hover:border-[#00B96B] dark:border-white/15 dark:bg-[#111319]"
        aria-label="Font family selector"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="truncate text-sm font-bold text-slate-900 dark:text-white"
            style={{ fontFamily: currentPreset?.id }}
          >
            {currentPreset?.label || selectedFontId}
          </span>
          {currentPreset?.isCustom && (
            <span className="rounded-md bg-[#00FF85]/20 px-1.5 py-0.5 text-[9px] font-black text-[#00FF85]">
              CUSTOM
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-white/60 ${
            isOpen ? 'rotate-180 text-[#00FF85]' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/15 dark:bg-[#0E0E14]/95">
          {/* Search Bar & Upload CTA */}
          <div className="flex items-center gap-1.5 pb-2">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400 dark:text-white/40" />
              <input
                type="text"
                placeholder="Search font family..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#00B96B] dark:border-white/10 dark:bg-white/5 dark:text-white"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onUploadClick();
                setIsOpen(false);
              }}
              className="flex items-center gap-1 rounded-lg border border-[#00FF85]/40 bg-[#00FF85]/10 px-2.5 py-1.5 text-xs font-bold text-[#087847] transition hover:bg-[#00FF85]/20 dark:text-[#00FF85]"
              title="Upload custom font (.ttf, .otf, .woff)"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-2 dark:border-white/10">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-bold capitalize transition ${
                  activeCategory === cat.id
                    ? 'bg-[#00FF85] text-[#050507]'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Fonts List */}
          <div className="mt-1.5 max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredFonts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-white/40">
                No fonts match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredFonts.map((font) => {
                const isSelected = selectedFontId === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => {
                      onSelectFont(font.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition ${
                      isSelected
                        ? 'border border-[#00FF85]/40 bg-[#00FF85]/15 text-[#00FF85]'
                        : 'text-slate-800 hover:bg-slate-100 dark:text-white/90 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-2">
                      <span
                        className="truncate text-sm font-semibold"
                        style={{ fontFamily: font.id }}
                      >
                        {font.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {font.isCustom ? (
                          <span className="rounded bg-[#00FF85]/20 px-1.5 py-0.5 text-[9px] font-black text-[#087847] dark:text-[#00FF85]">
                            UPLOADED
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-white/30">
                            {font.category}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-[#00FF85]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. REFINED FULL TEXT LAYER INSPECTOR
// ============================================================================
export interface ModernTextInspectorProps {
  layer: TextLayer;
  fonts: FontPreset[];
  onUpdate: (changes: Partial<TextLayer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUploadFontClick: () => void;
}

export function ModernTextInspector({
  layer,
  fonts,
  onUpdate,
  onDelete,
  onDuplicate,
  onUploadFontClick,
}: ModernTextInspectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      {/* Header bar: Title & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Typography
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            title="Duplicate text layer"
          >
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-rose-500 transition hover:bg-rose-500/10 hover:text-rose-600"
            title="Delete text layer"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Multiline Text Box Input */}
      <textarea
        id="sidebar-text-layer-editor"
        rows={Math.min(4, Math.max(2, layer.text.split('\n').length))}
        value={layer.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00B96B] dark:border-white/15 dark:bg-[#111319] dark:text-white"
        placeholder="Type your text (Enter for new line)"
        aria-label="Text box content"
      />

      {/* Font Family Dropdown */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
          Font Family
        </label>
        <ModernFontPicker
          selectedFontId={layer.fontFamily}
          fonts={fonts}
          onSelectFont={(fontId) => onUpdate({ fontFamily: fontId })}
          onUploadClick={onUploadFontClick}
        />
      </div>

      {/* Font Size (1 - 1000 with hold repeat & input) */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
          Font Size (Max 1000)
        </label>
        <FontSizeControl
          value={layer.fontSize}
          onChange={(sz) => onUpdate({ fontSize: sz })}
        />
      </div>

      {/* Core Typography Formatting Row: B, I, U, Aa, Alignments */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {/* Bold Button */}
        <button
          type="button"
          onClick={() =>
            onUpdate({ fontWeight: layer.fontWeight === 'normal' ? 'bold' : 'normal' })
          }
          className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-black transition ${
            layer.fontWeight !== 'normal'
              ? 'border-[#00B96B]/50 bg-[#00FF85]/20 text-[#087847] shadow-[0_0_12px_rgba(0,255,133,0.2)] dark:text-[#00FF85]'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
          }`}
          title="Bold (B)"
          aria-label="Toggle Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onClick={() => onUpdate({ italic: !layer.italic })}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-black transition ${
            layer.italic
              ? 'border-[#00B96B]/50 bg-[#00FF85]/20 text-[#087847] shadow-[0_0_12px_rgba(0,255,133,0.2)] dark:text-[#00FF85]'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
          }`}
          title="Italic (I)"
          aria-label="Toggle Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        {/* Underline Button */}
        <button
          type="button"
          onClick={() => onUpdate({ underline: !layer.underline })}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-black transition ${
            layer.underline
              ? 'border-[#00B96B]/50 bg-[#00FF85]/20 text-[#087847] shadow-[0_0_12px_rgba(0,255,133,0.2)] dark:text-[#00FF85]'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
          }`}
          title="Underline (U)"
          aria-label="Toggle Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>

        {/* Uppercase Toggle Button */}
        <button
          type="button"
          onClick={() => onUpdate({ uppercase: !layer.uppercase })}
          className={`flex h-8 px-2.5 items-center justify-center rounded-xl border text-xs font-black transition ${
            layer.uppercase
              ? 'border-[#00B96B]/50 bg-[#00FF85]/20 text-[#087847] shadow-[0_0_12px_rgba(0,255,133,0.2)] dark:text-[#00FF85]'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
          }`}
          title="Uppercase (Aa)"
          aria-label="Toggle Uppercase"
        >
          Aa
        </button>

        <span className="h-5 w-px bg-slate-300 dark:bg-white/10" />

        {/* Text Alignments */}
        <div className="flex items-center rounded-xl border border-slate-300 bg-white p-0.5 dark:border-white/15 dark:bg-[#111319]">
          <button
            type="button"
            onClick={() => onUpdate({ align: 'left' })}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              layer.align === 'left'
                ? 'bg-[#00FF85] text-[#050507]'
                : 'text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10'
            }`}
            title="Align Left"
            aria-label="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ align: 'center' })}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              layer.align === 'center'
                ? 'bg-[#00FF85] text-[#050507]'
                : 'text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10'
            }`}
            title="Align Center"
            aria-label="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ align: 'right' })}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              layer.align === 'right'
                ? 'bg-[#00FF85] text-[#050507]'
                : 'text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10'
            }`}
            title="Align Right"
            aria-label="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Glow & Shadow Toggles */}
        <button
          type="button"
          onClick={() => onUpdate({ glow: !layer.glow })}
          className={`flex h-8 px-2 items-center gap-1 rounded-xl border text-xs font-bold transition ${
            layer.glow
              ? 'border-[#00FF85] bg-[#00FF85]/20 text-[#00FF85] shadow-[0_0_15px_rgba(0,255,133,0.3)]'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-[#00FF85]/10 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
          }`}
          title="Toggle Neon Glow"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Glow</span>
        </button>
      </div>

      {/* Font Color Picker */}
      <div className="flex flex-col gap-1.5 pt-1">
        {/* Swatches with Rainbow Custom button on the LEFT */}
        <div className="flex flex-wrap items-center gap-1.5">
          <label
            className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 to-indigo-500 text-white shadow-sm transition hover:scale-110 dark:border-white/20"
            title="Pick custom color"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3] text-white drop-shadow" />
            <input
              type="color"
              value={layer.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          {COLOR_PALETTE.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => onUpdate({ color: col })}
              className={`h-6 w-6 rounded-lg border border-black/20 transition hover:scale-110 ${
                layer.color.toLowerCase() === col.toLowerCase()
                  ? 'ring-2 ring-[#00FF85] ring-offset-2 dark:ring-offset-[#111319]'
                  : ''
              }`}
              style={{ backgroundColor: col }}
              title={col}
            />
          ))}
        </div>
      </div>

      {/* Background Pill Selector */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
          Background Fill
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'none', label: 'None' },
            { id: 'black', label: 'Dark Glass' },
            { id: 'mint', label: 'Mint Glow' },
            { id: 'white', label: 'White' },
            { id: 'crimson', label: 'Crimson' },
            { id: 'sky', label: 'Neon Sky' },
            { id: 'amber', label: 'Gold Amber' },
            { id: 'purple', label: 'Purple Haze' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => onUpdate({ bgPill: pill.id as TextLayer['bgPill'] })}
              className={`rounded-lg border px-2 py-1.5 text-center text-[10px] font-bold transition ${
                (layer.bgPill || 'none') === pill.id
                  ? 'border-[#00FF85] bg-[#00FF85]/20 text-[#087847] dark:text-[#00FF85]'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-[#00FF85]/10 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Drawer: Spacing & Line Height */}
      <div className="pt-2 dark:border-white/10">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex w-full items-center justify-between text-[11px] font-bold text-slate-600 dark:text-white/60"
        >
          <span>Advanced Spacing & Shadows</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-2.5 flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white/50 p-2.5 dark:border-white/5 dark:bg-black/20">
            {/* Letter Spacing */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-white/50">
                <span>Letter Spacing</span>
                <span>{layer.letterSpacing || 0}px</span>
              </div>
              <input
                type="range"
                min={-2}
                max={20}
                step={1}
                value={layer.letterSpacing || 0}
                onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })}
                className="w-full accent-[#00FF85]"
              />
            </div>

            {/* Line Height */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-white/50">
                <span>Line Height</span>
                <span>{layer.lineHeight || 1.25}x</span>
              </div>
              <input
                type="range"
                min={0.9}
                max={2.5}
                step={0.05}
                value={layer.lineHeight || 1.25}
                onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
                className="w-full accent-[#00FF85]"
              />
            </div>

            {/* Shadow Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-white/75">
                Drop Shadow
              </span>
              <input
                type="checkbox"
                checked={!!layer.shadow}
                onChange={(e) => onUpdate({ shadow: e.target.checked })}
                className="h-4 w-4 rounded accent-[#00FF85]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 4. ELEMENT INSPECTOR (SHAPES, BADGES, STICKERS)
// ============================================================================
export interface ModernElementInspectorProps {
  layer: ElementLayer;
  onUpdate: (changes: Partial<ElementLayer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function ModernElementInspector({
  layer,
  onUpdate,
  onDelete,
  onDuplicate,
}: ModernElementInspectorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            {layer.name} ({layer.type})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            title="Duplicate element"
          >
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-rose-500 transition hover:bg-rose-500/10 hover:text-rose-600"
            title="Delete element"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Badge Text (if Badge type) */}
      {layer.type === 'badge' && (
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
            Badge Label Text
          </label>
          <input
            type="text"
            value={layer.badgeText || layer.name}
            onChange={(e) => onUpdate({ badgeText: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-[#38BDF8] dark:border-white/15 dark:bg-[#111319] dark:text-white"
          />
        </div>
      )}

      {/* Size Stepper (Hold-repeat) */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
          Element Size (px)
        </label>
        <FontSizeControl
          value={layer.size}
          onChange={(sz) => onUpdate({ size: sz })}
        />
      </div>

      {/* Rotation Slider */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
          <span>Rotation</span>
          <span>{layer.rotation || 0}°</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            value={layer.rotation || 0}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
            className="w-full accent-[#38BDF8] cursor-pointer"
          />
          <button
            type="button"
            onClick={() => onUpdate({ rotation: ((layer.rotation || 0) + 90) % 360 })}
            className="rounded-lg border border-slate-300 bg-[#00FF85]/10 px-2 py-1 text-[10px] font-bold text-[#00FF85] hover:bg-[#00FF85]/20 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
            title="+90° Rotate"
          >
            +90°
          </button>
        </div>
      </div>

      {/* Opacity Slider */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
          <span>Opacity</span>
          <span>{Math.round((layer.opacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={layer.opacity ?? 1}
          onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
          className="w-full accent-[#38BDF8] cursor-pointer"
        />
      </div>

      {/* Color Swatches */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <label
            className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 to-indigo-500 text-white shadow-sm transition hover:scale-110 dark:border-white/20"
            title="Pick custom color"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3] text-white drop-shadow" />
            <input
              type="color"
              value={layer.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          {COLOR_PALETTE.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => onUpdate({ color: col })}
              className={`h-6 w-6 rounded-lg border border-black/20 transition hover:scale-110 ${
                layer.color.toLowerCase() === col.toLowerCase()
                  ? 'ring-2 ring-[#38BDF8] ring-offset-2 dark:ring-offset-[#111319]'
                  : ''
              }`}
              style={{ backgroundColor: col }}
              title={col}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
