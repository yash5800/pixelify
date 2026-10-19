import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Trash2 } from 'lucide-react';
import type { ViewTab, ThemeMode } from '../types';
import Icon from './Icon';
import Logo from './Logo';

type Engine = 'webgpu' | 'wasm' | null;

interface NavbarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  /** Live engine of the upscaler's ONNX session (from session EPs) */
  upscalerEngine: Engine;
  /** Live engine reported by the BG remover worker pipeline */
  bgEngine: Engine;
  webgpuAvailable: boolean | null;
  modelStatus: string;
  isClearingModelCache: boolean;
  canClearModelCache: boolean;
  onClearModelCache: () => void;
  historyCount?: number;
  /** Opens the mobile navigation sidebar (hamburger, < md only) */
  onOpenMobileSidebar?: () => void;
  /** Hides the navbar on mobile (< lg) — e.g. when the upscaler workspace owns the screen */
  mobileHidden?: boolean;
}

/** Small dynamic engine pill used in the settings dropdown & mobile sidebar (exported) */
export function EngineRow({ label, engine }: { label: string; engine: Engine }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-semibold text-neutral-400">{label}</span>
      {engine === null ? (
        <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-bold text-neutral-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
          <span className="h-1 w-1 rounded-full bg-neutral-500 animate-pulse" />
          DETECTING…
        </span>
      ) : engine === 'webgpu' ? (
        <span
          className="font-mono text-[9.5px] font-bold text-[#00FF85] bg-[#00FF85]/10 border border-[#00FF85]/20 px-1.5 py-0.5 rounded"
          title="Hardware-accelerated GPU inference (Fast)"
        >
          Fast
        </span>
      ) : (
        <span
          className="font-mono text-[9.5px] font-bold text-sky-300 bg-sky-400/10 border border-sky-400/20 px-1.5 py-0.5 rounded"
          title="CPU inference (Standard)"
        >
          Standard
        </span>
      )}
    </div>
  );
}

export default function Navbar({
  activeTab,
  onTabChange,
  upscalerEngine,
  bgEngine,
  webgpuAvailable,
  modelStatus,
  isClearingModelCache,
  canClearModelCache,
  onClearModelCache,
  historyCount = 0,
  onOpenMobileSidebar,
  mobileHidden = false,
}: NavbarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track scroll position to adjust header elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`sticky top-0 inset-x-0 z-[60] w-full select-none py-3.5 bg-transparent border-none pointer-events-none transition-all duration-300 ${mobileHidden ? 'max-lg:hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4 relative">

          {/* MOBILE SIDEBAR MENU BUTTON (< md): opens the navigation sidebar drawer */}
          <button
            type="button"
            onClick={() => onOpenMobileSidebar?.()}
            aria-label="Open navigation menu"
            className="pointer-events-auto
              mr-1
              h-11
              w-11
              shrink-0
              cursor-pointer
              flex
              items-center
              justify-center
              rounded-full
              bg-white/10
              border
              border-white/20
              backdrop-blur-xl
              text-white
              shadow-xl
              transition-all
              duration-200
              active:scale-95
              md:hidden"
          >
            <Menu size={20} strokeWidth={2.2} />
          </button>

          {/* LOGO (LEFT SIDE: Frosted Glass Capsule with Blur) */}
          <div
            onClick={() => onTabChange('home')}
            className="pointer-events-auto
              h-11
              cursor-pointer
              group
              shrink-0
              flex
              items-center
              bg-transparent
              border-0
              p-0
              shadow-none
              transition-transform
              duration-300
              active:scale-95"
          >
            {/* LOGO — LEFT */}
            <button
              type="button"
              onClick={() => onTabChange("home")}
              className="
                  pointer-events-auto
                  shrink-0
                  h-11
                  flex
                  items-center
                  justify-center
                  cursor-pointer
                  bg-transparent
                  border-0
                  outline-none
                  p-0
                  transition-transform
                  duration-200
                  hover:scale-[1.025]
                  active:scale-[0.97]
                "
              aria-label="Go to home"
            >
              <Logo
                size="sm"
                className="
                    origin-left
                    scale-[0.72]
                    sm:scale-[0.78]
                  "
              />
            </button>

          </div>

          {/* DESKTOP CENTERED FLOATING PILL NAV BAR (HIDDEN ON MOBILE < md) */}
          <nav
            aria-label="Desktop Navigation"
            className="pointer-events-auto hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-11 bg-white/10 border border-white/20 rounded-full p-1 items-center gap-1 backdrop-blur-xl shadow-xl"
          >
            <button
              onClick={() => onTabChange('home')}
              className={`h-full px-5 rounded-full text-sm font-bold transition-all duration-300 flex items-center justify-center whitespace-nowrap ${
                activeTab === 'home'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-300 hover:text-white font-medium'
              }`}
            >
              Home
            </button>

            <button
              onClick={() => onTabChange('bg_remove')}
              className={`h-full px-5 rounded-full text-sm font-bold transition-all duration-300 flex items-center justify-center whitespace-nowrap ${
                activeTab === 'bg_remove'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-300 hover:text-white font-medium'
              }`}
            >
              BG Remover
            </button>

            <button
              onClick={() => onTabChange('upscaler')}
              className={`h-full px-5 rounded-full text-sm font-bold transition-all duration-300 flex items-center justify-center whitespace-nowrap ${
                activeTab === 'upscaler'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-300 hover:text-white font-medium'
              }`}
            >
              AI Upscaler
            </button>
          </nav>

          {/* SETTINGS GEAR ICON BUTTON (RIGHT SIDE) */}
          <div className="pointer-events-auto relative ml-auto" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl text-white items-center justify-center transition-all shadow-xl active:scale-95"
              title="Settings & Preferences"
              aria-label="Settings and Preferences"
            >
              <Icon className='text-gray-300' name="settings" size={19} />
            </button>

            {/* SETTINGS DROPDOWN MENU */}
            {isSettingsOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-[#121218] border border-white/15 p-3.5 shadow-2xl z-50 animate-fade-in flex flex-col gap-3">
                <div className="px-1 py-0.5 border-b border-white/10 flex flex-col gap-1.5 text-xs font-bold text-white pb-2">
                  <span>Settings & Preferences</span>
                  <EngineRow label="AI Upscaler engine" engine={upscalerEngine} />
                  <EngineRow label="BG Remover engine" engine={bgEngine} />
                </div>
                <div className="flex items-center justify-between px-1 text-[11px]">
                  <span className="font-semibold text-neutral-400">WebGPU availability</span>
                  <span className={`font-mono text-[9.5px] font-bold ${webgpuAvailable === null ? 'text-neutral-500' : webgpuAvailable ? 'text-[#00FF85]' : 'text-sky-300'}`}>
                    {webgpuAvailable === null ? 'CHECKING…' : webgpuAvailable ? 'Fast' : 'Standard'}
                  </span>
                </div>
                <p className="px-1 text-[10px] leading-relaxed text-neutral-500">{modelStatus}</p>
                  <button
                    type="button"
                    onClick={onClearModelCache}
                    disabled={isClearingModelCache || !canClearModelCache}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    title="Remove downloaded AI models from this browser"
                  >
                    <Trash2 size={14} />
                    {isClearingModelCache ? 'Clearing models…' : 'Clear downloaded models'}
                  </button>
                  <Link
                    to="/blogs/enable_webgpu_guide_b5c9e8"
                    onClick={() => setIsSettingsOpen(false)}
                    className="mt-1.5 block px-1 text-[10px] font-medium text-[#00FF85] hover:text-[#00FF85]/80 hover:underline transition-colors leading-relaxed"
                  >
                    Learn how to enable webGPU on your browser!
                  </Link>
                </div>
            )}
          </div>

        </div>
      </header>

    </>
  );
}
