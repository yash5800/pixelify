import React, { useEffect, useCallback, useState } from 'react';
import { X, Home, Eraser, Maximize, ChevronRight, Trash2, ExternalLink, Cpu, Globe, Check, Pencil } from 'lucide-react';
import type { ViewTab } from '../types';
import Logo from './Logo';
import { EngineRow } from './Navbar';
import { useApp } from './AppProvider';
import { SITE_LANGUAGES } from '../lib/i18n';
import { useTranslation } from '../locales';
import { getSavedDisplayName, requestDisplayNameEdit, VISITOR_PROFILE_UPDATED_EVENT } from '@/lib/visitor-profile';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

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
  isOnline?: boolean;
}

const NAV_ITEMS: { tab: ViewTab; label: string; Icon: React.ElementType }[] = [
  { tab: 'home', label: 'Home', Icon: Home },
  { tab: 'bg_remove', label: 'BG Remover', Icon: Eraser },
  { tab: 'upscaler', label: 'AI Upscaler', Icon: Maximize },
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
  isOnline = true,
}: MobileSidebarProps) {
  const { currentLang, setCurrentLang } = useApp();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState('Anonymous player');

  useEffect(() => {
    const syncDisplayName = () => setDisplayName(getSavedDisplayName() || 'Anonymous player');
    syncDisplayName();
    window.addEventListener(VISITOR_PROFILE_UPDATED_EVENT, syncDisplayName);
    return () => window.removeEventListener(VISITOR_PROFILE_UPDATED_EVENT, syncDisplayName);
  }, []);

  const handleLanguageChange = useCallback((newLang: string) => {
    setCurrentLang(newLang);
    onClose();

    if (!pathname) return;

    if (pathname.startsWith('/blog')) {
      const rawSegments = pathname.replace(/^\/blog\/?/, '').split('/').filter(Boolean);
      if (rawSegments.length === 0) {
        router.push(newLang === 'en' ? '/blog/' : `/blog/${newLang}/`);
        return;
      }
      if (rawSegments.length === 1) {
        const seg = rawSegments[0];
        const isLangIndex = SITE_LANGUAGES.some((l) => l.code === seg);
        if (isLangIndex) {
          router.push(newLang === 'en' ? '/blog/' : `/blog/${newLang}/`);
        } else {
          router.push(newLang === 'en' ? `/blog/${seg}/` : `/blog/${newLang}/${seg}/`);
        }
        return;
      }
      if (rawSegments.length >= 2) {
        const slug = rawSegments[1];
        router.push(newLang === 'en' ? `/blog/${slug}/` : `/blog/${newLang}/${slug}/`);
        return;
      }
    }

    // General route handling across the entire site
    const cleanPath = pathname.replace(/^\//, '').replace(/\/$/, '');
    const segments = cleanPath.split('/').filter(Boolean);

    // If first segment is an existing language code, strip it
    if (segments.length > 0 && SITE_LANGUAGES.some((l) => l.code === segments[0])) {
      segments.shift();
    }

    const restPath = segments.join('/');
    const target = restPath ? `/${newLang}/${restPath}/` : `/${newLang}/`;
    router.push(target);
  }, [pathname, router, setCurrentLang, onClose]);
  const navItems = [
    { tab: 'home' as ViewTab, label: t.nav.home, Icon: Home },
    { tab: 'bg_remove' as ViewTab, label: t.nav.bgRemove, Icon: Eraser },
    { tab: 'upscaler' as ViewTab, label: t.nav.upscaler, Icon: Maximize },
  ];

  // Close on Escape while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* Navigate, close, and always land at the TOP of the new page -
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
        <div className="flex items-center justify-between px-4 pt-5 pb-3.5">
          <button
            type="button"
            onClick={() => go('home')}
            className="flex cursor-pointer items-center bg-transparent p-0 transition-transform duration-200 active:scale-95"
            aria-label="Go to home"
          >
            <Logo size="xs" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => { onClose(); requestDisplayNameEdit(); }}
          className="mx-2.5 mb-3 flex min-h-14 items-center gap-3 px-2 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-200/20 bg-sky-200/[0.08] text-sm font-semibold text-sky-100" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white/90">{displayName}</span>
            <span className="mt-0.5 block text-[10px] text-white/40">Display name</span>
          </span>
          <Pencil size={14} className="shrink-0 text-white/45" aria-hidden="true" />
        </button>

        {/* SECTION LABEL */}
        <span className="px-4 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          Platform
        </span>

        {/* NAV LINKS (flat rows: icon + label + right chevron) */}
        <nav className="flex flex-col gap-1 px-3" aria-label="Mobile sidebar navigation">
          {navItems.map(({ tab, label, Icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => go(tab)}
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-all ${isActive
                    ? 'bg-white/[0.1] font-semibold text-white shadow-sm border border-white/10'
                    : 'font-medium text-neutral-300 hover:bg-white/[0.04] hover:text-white border border-transparent'
                  }`}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}
                />
                <span className="flex-1 text-left">{label}</span>
                <ChevronRight
                  size={15}
                  className={isActive ? 'text-neutral-300' : 'text-neutral-500 group-hover:text-neutral-400'}
                />
              </button>
            );
          })}
        </nav>

        {/* FOOTER: ENGINE STATUS & SETTINGS */}
        <div className="mt-auto flex flex-col gap-2.5 border-t border-white/[0.08] px-4 pb-8 pt-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            <Cpu size={12} className="text-violet-300/80" />
            <span>Engines & Settings</span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-white/[0.07] bg-black/25 px-2.5 py-2">

            <EngineRow label={t.nav.upscaler} engine={upscalerEngine} />
            <EngineRow label={t.nav.bgRemove} engine={bgEngine} />
            {webgpuAvailable !== undefined && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-neutral-400">{t.nav.webgpuSupport}</span>
                <span
                  className={`font-mono text-[9.5px] font-bold ${webgpuAvailable === null
                      ? 'text-neutral-500'
                      : webgpuAvailable
                        ? 'text-[#00FF85]'
                        : 'text-sky-300'
                    }`}
                >
                  {webgpuAvailable === null
                    ? t.nav.checking
                    : webgpuAvailable
                      ? t.nav.available
                      : t.nav.unavailable}
                </span>
              </div>
            )}
          </div>

          {modelStatus && (
            <p className="px-0.5 text-[9.5px] leading-relaxed text-neutral-500">
              {modelStatus}
            </p>
          )}

          {/* LANGUAGE SELECTOR */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-neutral-400">
              <span className="flex items-center gap-1.5"><Globe size={13} className="text-violet-300" /> {t.nav.selectLanguage}</span>
              <span className="font-mono text-[10px] text-white/50 uppercase font-bold">{currentLang}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SITE_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    disabled={!lang.active}
                    onClick={() => {
                      if (lang.active) {
                        handleLanguageChange(lang.code);
                      }
                    }}
                    className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors ${isSelected
                        ? 'border border-[#00ff85]/30 bg-[#00ff85]/10 font-bold text-white'
                        : lang.active
                          ? 'border border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]'
                          : 'border border-white/5 bg-transparent text-neutral-600 opacity-40 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                        {isSelected && <Check size={12} className="text-[#00ff85]" />}
                      </div>
                      <span className="truncate">{lang.nativeLabel}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                      <span className="font-mono text-[10px] text-neutral-400 font-bold">
                        {lang.short}
                      </span>
                      {!lang.active && (
                        <span className="text-[9px] text-neutral-500 font-mono">{t.common.soon}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {onClearModelCache && (
            <div className="flex flex-col gap-1.5 pt-2.5">
              <button
                type="button"
                onClick={onClearModelCache}
                disabled={isClearingModelCache || !canClearModelCache}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                title={!canClearModelCache && !isClearingModelCache ? (t.nav?.noModelsCached || 'No models currently cached') : t.nav.clearModelsDesc}
              >
                <Trash2 size={13} className={isClearingModelCache ? 'animate-pulse text-white/50' : 'text-white/50'} />
                <span>{isClearingModelCache ? t.nav.clearing : t.nav.clearModels}</span>
              </button>
              <Link
                href={"/blog/enable_webgpu_guide_b5c9e8"}
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] px-3 py-2.5 text-[11px] font-medium text-violet-200 transition-colors hover:bg-violet-400/[0.14] hover:text-violet-100 active:scale-[0.98]"
                title={t.nav.learnWebgpu}
              >
                <ExternalLink size={13} className="shrink-0 text-violet-300" />
                <span>{t.nav.learnWebgpu}</span>
              </Link>
            </div>
          )}
        </div>

      </aside>
    </div>
  );
}
