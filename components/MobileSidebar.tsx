import React, { useEffect } from 'react';
import { X, Home, Eraser, Sparkles, ChevronRight, Trash2, Link2Off } from 'lucide-react';
import type { ViewTab } from '../types';
import Logo from './Logo';
import { EngineRow } from './Navbar';
import Link from 'next/link';

type Engine = 'webgpu' | 'wasm' | null;

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  /** Live engine of the upscaler's ONNX session (from session EPs) */
  upscalerEngine: Engine;
  /** Live engine reported by the BG remover worker pipeline */
  bgEngine: Engine;
  webgpuAvailable?: boolean | null;
  modelStatus?: string;
  isClearingModelCache?: boolean;
  canClearModelCache?: boolean;
  onClearModelCache?: () => void;
}

const NAV_ITEMS: { tab: ViewTab; label: string; Icon: React.ElementType }[] = [
  { tab: 'home', label: 'Home', Icon: Home },
  { tab: 'bg_remove', label: 'BG Remover', Icon: Eraser },
  { tab: 'upscaler', label: 'AI Upscaler', Icon: Sparkles },
];

/**
 * MOBILE NAVIGATION SIDEBAR (shadcn-style dark sidebar, < md only).
 * Near-black flat panel: brand header with icon square + subtitle, a
 * "Platform" section label, flat icon rows with right chevrons, and a
 * profile-style footer. Slides in from the left over a dimmed backdrop;
 * closes on backdrop tap, X button, Escape key or after navigating.
 */
export default function MobileSidebar({
  open,
  onClose,
  activeTab,
  onTabChange,
  upscalerEngine,
  bgEngine,
  webgpuAvailable,
  modelStatus,
  isClearingModelCache = false,
  canClearModelCache = true,
  onClearModelCache,
}: MobileSidebarProps) {
  // Close on Escape while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* Navigate, close, and always land at the TOP of the new page —
     the router keeps the previous scroll position otherwise. */
  const go = (tab: ViewTab) => {
    onTabChange(tab);
    onClose();
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      {/* DIMMED BACKDROP */}
      <div
        className="absolute inset-0 bg-black/80 animate-fade-in"
        onClick={onClose}
      />

      {/* SLIDING PANEL (flat near-black, rounded on the right edge) */}
      <aside className="animate-slide-in-left absolute left-0 top-0 flex h-full w-[300px] max-w-[85vw] flex-col overflow-y-auto rounded-r-2xl border-r border-white/10 bg-[#0A0A0C] shadow-[0_0_60px_rgba(0,0,0,0.9)]">

        {/* HEADER: PIXELIFY LOGO + CLOSE */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <button
            type="button"
            onClick={() => go('home')}
            className="flex cursor-pointer items-center bg-transparent p-0 transition-transform duration-200 active:scale-95"
            aria-label="Go to home"
          >
            <Logo size="sm" className="origin-left scale-[0.60]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
          >
            <X size={30} />
          </button>
        </div>

        <div className="mx-4 border-t border-white/[0.08]" />

        {/* SECTION LABEL */}
        <span className="px-4 pb-1 pt-5 text-[13px] font-medium text-neutral-400">
          Platform
        </span>

        {/* NAV LINKS (flat rows: icon + label + right chevron) */}
        <nav className="flex flex-col gap-0.5 px-2" aria-label="Mobile sidebar navigation">
          {NAV_ITEMS.map(({ tab, label, Icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => go(tab)}
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-[15px] transition-colors ${
                  isActive
                    ? 'bg-white/[0.08] font-semibold text-white'
                    : 'font-medium text-neutral-300 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}
                />
                <span className="flex-1 text-left">{label}</span>
                <ChevronRight
                  size={16}
                  className={isActive ? 'text-neutral-300' : 'text-neutral-500'}
                />
              </button>
            );
          })}
        </nav>

        {/* FOOTER: ENGINE STATUS & SETTINGS */}
        <div className="mt-auto flex flex-col gap-2.5 border-t border-white/[0.08] px-4 pb-6 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Engines & Settings
          </span>
          <div className="flex flex-col gap-1.5">
            <EngineRow label="AI Upscaler engine" engine={upscalerEngine} />
            <EngineRow label="BG Remover engine" engine={bgEngine} />
            {webgpuAvailable !== undefined && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-neutral-400">WebGPU availability</span>
                <span
                  className={`font-mono text-[9.5px] font-bold ${
                    webgpuAvailable === null
                      ? 'text-neutral-500'
                      : webgpuAvailable
                      ? 'text-[#00FF85]'
                      : 'text-sky-300'
                  }`}
                >
                  {webgpuAvailable === null
                    ? 'CHECKING…'
                    : webgpuAvailable
                    ? 'Fast'
                    : 'Standard'}
                </span>
              </div>
            )}
          </div>

          {modelStatus && (
            <p className="px-0.5 text-[10px] leading-relaxed text-neutral-500">
              {modelStatus}
            </p>
          )}

          {onClearModelCache && (
            <div className="border-t border-white/10 pt-2.5">
              <button
                type="button"
                onClick={onClearModelCache}
                disabled={isClearingModelCache || !canClearModelCache}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                title="Remove downloaded AI models from this browser"
              >
                <Trash2 size={14} className={isClearingModelCache ? 'animate-pulse' : ''} />
                {isClearingModelCache ? 'Clearing models…' : 'Clear downloaded models'}
              </button>
              <Link
                href={"/blogs/enable_webgpu_guide_b5c9e8"}
                onClick={onClose}
                className="mt-1.5 block px-0.5 text-[10px] font-medium text-[#00FF85] hover:text-[#00FF85]/80 hover:underline transition-colors leading-relaxed"
              >
                Learn how to enable webGPU on your browser!
              </Link>
            </div>
          )}
        </div>

      </aside>
    </div>
  );
}