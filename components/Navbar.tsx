import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Menu, Trash2, WifiOff, Wifi, Cpu, Gauge, ExternalLink } from 'lucide-react';
import type { ViewTab, ThemeMode } from '../types';
import type { ModelDownloadItem } from '../types';
import Icon from './Icon';
import Logo from './Logo';
import ModelDownloadIndicator from './ModelDownloadIndicator';
import { useApp } from './AppProvider';
import Link from 'next/link';

type Engine = 'webgpu' | 'wasm' | null;

/** Desktop pill-nav items (order matters — it drives the sliding pill). */
const DESKTOP_NAV_ITEMS: { tab: ViewTab; label: string; warmup?: boolean }[] = [
  { tab: 'home', label: 'Home' },
  { tab: 'bg_remove', label: 'BG Remover', warmup: true },
  { tab: 'upscaler', label: 'Upscaler', warmup: true },
];

interface NavbarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  /** Live list of AI model downloads (navbar badge). */
  modelDownloads?: ModelDownloadItem[];
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
  /** Whether the mobile navigation sidebar drawer is currently open */
  isMobileSidebarOpen?: boolean;
  /** Hides the navbar on mobile (< lg) — e.g. when the upscaler workspace owns the screen */
  mobileHidden?: boolean;
  /** Offline / online status */
  isOnline?: boolean;
  justReconnected?: boolean;
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
  modelDownloads = [],
  upscalerEngine,
  bgEngine,
  webgpuAvailable,
  modelStatus,
  isClearingModelCache,
  canClearModelCache,
  onClearModelCache,
  historyCount = 0,
  onOpenMobileSidebar,
  isMobileSidebarOpen = false,
  mobileHidden = false,
  isOnline = true,
  justReconnected = false,
}: NavbarProps) {
  const { warmup, isMobileSidebarOpen: ctxMobileOpen } = useApp();
  const isMobileMenuOpen = isMobileSidebarOpen || ctxMobileOpen || false;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  /* DESKTOP ACTIVE PILL — CSS transform transition (compositor-driven).
     Deliberately NOT a framer-motion layout animation: layout/FLIP runs on
     the main thread and stutters while Next.js mounts the next page (the
     three.js hero is heavy at the same instant). Transform transitions are
     GPU-composited and never drop frames from page-mount work. */
  const navRef = useRef<HTMLElement>(null);
  const navBtnRefs = useRef<Partial<Record<ViewTab, HTMLButtonElement | null>>>({});
  const pillNeedTransition = useRef(false); // false until first measurement, so it doesn't fly in from 0,0
  const [activePillStyle, setActivePillStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'translate(0px, 0px)',
    width: 0,
    height: 0,
    transition: 'none',
  });

  /* The pill targets this tab — set INSTANTLY on navbar click, before the
     route changes, so the slide starts immediately instead of waiting for
     Next.js navigation to land. Synced back from activeTab for browser
     back/forward and links outside the navbar. */
  const [pillTab, setPillTab] = useState<ViewTab>(activeTab);
  const [pillPos, setPillPos] = useState({ x: 0, y: 0 });

  const measureActivePill = useCallback((tab: ViewTab) => {
    const nav = navRef.current;
    const btn = navBtnRefs.current[tab];
    if (!nav || !btn) {
      // Active tab has no desktop nav item (e.g. blogs / static pages).
      setActivePillStyle((prev) => (prev.opacity === 0 ? prev : { ...prev, opacity: 0 }));
      return;
    }
    const btnRect = btn.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const x = btnRect.left - navRect.left - nav.clientLeft;
    const y = btnRect.top - navRect.top - nav.clientTop;
    setPillPos({ x, y });

    const style: React.CSSProperties = {
      opacity: 1,
      width: btnRect.width,
      height: btnRect.height,
      /* An absolutely positioned child's containing block is the nav's PADDING
         box (left-0 sits inside the border), so subtract the border width —
         otherwise the pill sits 1px right/down of the button. */
      transform: `translate(${x}px, ${y}px)`,
      /* transform + width animate the slide; must be EXPLICIT on every update
         (React drops the key when absent → transition 'none' → instant jump). */
      transition: pillNeedTransition.current
        ? 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1), width 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease'
        : 'none',
    };
    pillNeedTransition.current = true;
    setActivePillStyle(style);
  }, []);

  /* Navbar click handler: start the pill slide now, navigate after.
     Both happen in the same tick — the browser paints the pill's first
     animation frame before the next page's heavy mount work can block it. */
  const selectTab = useCallback(
    (tab: ViewTab) => {
      setPillTab(tab);
      measureActivePill(tab);
      onTabChange(tab);
    },
    [measureActivePill, onTabChange]
  );

  // Route changed from outside the navbar (back/forward, footer links) → follow it.
  useLayoutEffect(() => {
    setPillTab(activeTab);
  }, [activeTab]);

  // Re-measure when the pill target changes and after font/layout settles.
  // activeTab matters too: when the route lands, buttons restyle to
  // font-bold — widths shift, so the pill must be re-measured or it settles
  // misaligned (measured against the still-medium labels).
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => { if (!cancelled) measureActivePill(pillTab); };
    measure();
    // Two frames later too: font swap after hydration can shift text width.
    requestAnimationFrame(() => requestAnimationFrame(measure));
    // Google Fonts (Inter, display=swap) land late — re-measure after every
    // swap; fallback and webfont metrics differ, which throws the pill off.
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    const onFontsDone = () => measure();
    fonts?.ready.then(onFontsDone).catch(() => {});
    fonts?.addEventListener?.('loadingdone', onFontsDone);
    return () => {
      cancelled = true;
      fonts?.removeEventListener?.('loadingdone', onFontsDone);
    };
  }, [pillTab, activeTab, measureActivePill]);

  // Keep the pill glued to its button on resize / zoom.
  useEffect(() => {
    const onResize = () => measureActivePill(pillTab);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pillTab, measureActivePill]);

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

          {/* LOGO (Mobile: All the way right & fades when sidebar opens, Desktop: Left) */}
          <div
            className={`pointer-events-auto
              h-11
              shrink-0
              flex
              items-center
              bg-transparent
              border-0
              p-0
              shadow-none
              transition-all
              duration-300
              order-3 md:order-1
              ${isMobileMenuOpen
                ? 'max-md:opacity-0 max-md:pointer-events-none max-md:scale-90 max-md:invisible'
                : 'max-md:opacity-100 max-md:scale-100 max-md:visible'
              }`}
          >
            <button
              type="button"
              onClick={() => selectTab("home")}
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
                  origin-right md:origin-left
                  scale-[0.72]
                  sm:scale-[0.78]
                "
              />
            </button>
          </div>

          {/* DESKTOP CENTERED FLOATING PILL NAV BAR (HIDDEN ON MOBILE < md) */}
          <nav
            ref={navRef}
            aria-label="Desktop Navigation"
            className="pointer-events-auto hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-11 bg-white/10 border border-white/20 rounded-full p-1 items-center gap-1 backdrop-blur-xl shadow-xl will-change-transform"
          >
            {/* BASE LAYER (clickable buttons with light text) */}
            {DESKTOP_NAV_ITEMS.map(({ tab, label, warmup: needsWarmup }) => (
              <button
                key={tab}
                ref={(el) => { navBtnRefs.current[tab] = el; }}
                type="button"
                onClick={() => selectTab(tab)}
                onMouseEnter={needsWarmup ? () => warmup(tab) : undefined}
                className="relative z-10 h-full px-5 rounded-full text-sm font-semibold flex items-center justify-center whitespace-nowrap text-neutral-300 hover:text-white transition-colors duration-200"
              >
                <span>{label}</span>
              </button>
            ))}

            {/* WHITE ACTIVE PILL — clip-mask reveal layer */}
            <span
              aria-hidden="true"
              style={activePillStyle}
              className="pointer-events-none absolute left-0 top-0 z-20 rounded-full bg-white shadow-md overflow-hidden"
            >
              {/* Synchronized counter-translated mirror container */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-11 p-1 flex items-center gap-1 whitespace-nowrap"
                style={{
                  transform: `translate(${-pillPos.x}px, ${-pillPos.y}px)`,
                  transition: activePillStyle.transition,
                }}
              >
                {DESKTOP_NAV_ITEMS.map(({ tab, label }) => (
                  <span
                    key={tab}
                    className="h-full px-5 rounded-full text-sm font-semibold flex items-center justify-center whitespace-nowrap text-black select-none"
                  >
                    {label}
                  </span>
                ))}
              </span>
            </span>
          </nav>

          {/* RIGHT SIDE GROUP: connection badge + model downloads badge + settings gear */}
          <div className="pointer-events-auto relative ml-auto flex items-center gap-2 order-2 md:order-2">
            {/* OFFLINE / RECONNECTED BADGE */}
            {!isOnline ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold backdrop-blur-md shadow-sm transition-all"
                title="Offline Mode — WebGPU & WebAssembly AI runs 100% locally on your device"
              >
                <WifiOff size={13} className="text-amber-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Offline</span>
                <span className="sm:hidden">Offline</span>
              </div>
            ) : justReconnected ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00FF85]/15 border border-[#00FF85]/30 text-[#00FF85] text-[11px] font-semibold backdrop-blur-md shadow-sm animate-fade-in"
                title="Online — Back online"
              >
                <Wifi size={13} className="text-[#00FF85] shrink-0" />
                <span className="hidden sm:inline">Online</span>
              </div>
            ) : null}

            {/* MODEL DOWNLOADS BADGE — only while models are transferring */}
            {modelDownloads.length > 0 && (
              <ModelDownloadIndicator items={modelDownloads} />
            )}

            {/* SETTINGS GEAR ICON BUTTON */}
            <div className="relative" ref={settingsRef}>
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
              <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-[#121218]/95 backdrop-blur-xl border border-white/15 p-3 shadow-2xl z-50 animate-fade-in flex flex-col gap-2">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/70">
                    <Cpu size={12} /> Processing engines <span className="ml-auto h-px flex-1 bg-gradient-to-r from-violet-300/20 to-transparent" />
                  </div>
                  <div className="space-y-1 rounded-xl border border-white/[0.07] bg-black/25 px-2.5 py-2">
                    <div className="settings-row-enter engine-row-shell" style={{ animationDelay: '55ms' }}><EngineRow label="Upscaler" engine={upscalerEngine} /></div>
                    <div className="settings-row-enter engine-row-shell" style={{ animationDelay: '105ms' }}><EngineRow label="BG Remover" engine={bgEngine} /></div>
                  </div>
                  <div className="settings-row-enter mt-1.5 flex items-center justify-between rounded-xl border border-violet-200/[0.13] bg-gradient-to-r from-violet-300/[0.08] via-white/[0.035] to-teal-200/[0.06] px-2.5 py-1.5" style={{ animationDelay: '155ms' }}>
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/70"><Gauge size={13} className="text-violet-200/70" />WebGPU support</span>
                    <span className={`text-[10px] font-semibold ${webgpuAvailable === null ? 'text-white/40' : webgpuAvailable ? 'text-emerald-300' : 'text-sky-300'}`}>
                      {webgpuAvailable === null ? 'Checking' : webgpuAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="mt-1.5 px-0.5 text-[9.5px] leading-relaxed text-white/35">{modelStatus}</p>
                </div>

                <div className="settings-row-enter grid grid-cols-2 gap-1.5 pt-1.5" style={{ animationDelay: '205ms' }}>
                  <button
                    type="button"
                    onClick={onClearModelCache}
                    disabled={isClearingModelCache || !canClearModelCache}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-center text-[11px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    title="Remove downloaded AI models from this browser"
                  >
                    <Trash2 size={13} className="shrink-0 text-white/50" />
                    <span className="truncate">{isClearingModelCache ? 'Clearing…' : 'Clear models'}</span>
                  </button>
                  <Link
                    href={"/blogs/enable_webgpu_guide_b5c9e8"}
                    onClick={()=>setIsSettingsOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] px-2 py-2 text-center text-[11px] font-medium text-violet-200 hover:bg-violet-400/[0.14] hover:text-violet-100 transition-colors"
                    title="Learn how to enable WebGPU in your browser"
                  >
                    <ExternalLink size={13} className="shrink-0 text-violet-300" />
                    <span className="truncate">Learn about WebGPU</span>
                  </Link>
                </div>
              </div>
            )}
            </div>
          </div>

        </div>
      </header>

    </>
  );
}
