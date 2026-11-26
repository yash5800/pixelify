"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Globe,
  Menu, Moon, Search, ShieldCheck, Sun, X
} from "lucide-react";
import { navGroups, articles } from "@/data/docs/docs-data";
import { PixelMascot } from "./pixel-mascot";
import Logo from "@/components/Logo";
import { useApp } from "@/components/AppProvider";
import { SITE_LANGUAGES } from "@/lib/i18n";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentLang, setCurrentLang } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(true);

  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pixelify_docs_theme");
      if (saved !== null) {
        setDark(saved === "dark");
      } else {
        setDark(true);
      }
    } catch {
      setDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("pixelify_docs_theme", next ? "dark" : "light");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    if (langOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLanguageChange = (newLang: string) => {
    setCurrentLang(newLang);
    setLangOpen(false);
    if (!pathname) return;

    let clean = pathname.replace(/^\//, "").replace(/\/$/, "");
    const segments = clean.split("/").filter(Boolean);

    if (segments.length > 0 && SITE_LANGUAGES.some((l) => l.code === segments[0])) {
      segments.shift();
    }

    const rest = segments.join("/");
    const target = newLang === "en"
      ? (rest ? `/${rest}/` : "/")
      : (rest ? `/${newLang}/${rest}/` : `/${newLang}/`);

    router.push(target);
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return Object.values(articles).slice(0, 4);
    return Object.values(articles).filter((a) =>
      `${a.title} ${a.description} ${a.category}`.toLowerCase().includes(q)
    );
  }, [query]);

  const sidebar = (
    <div className="px-sidebar-inner">
      <nav className="px-nav">
        {navGroups.map((group) => (
          <div className="px-nav-group" key={group.title}>
            <div className="px-nav-label">{group.title}</div>
            {group.items.map((item) => {
              const targetUrl = item.href || `/docs/${item.slug}`;
              const active = item.slug === "overview"
                ? pathname === "/overview" ||
                  pathname === "/overview/" ||
                  pathname === "/docs" ||
                  pathname === "/docs/" ||
                  pathname?.endsWith("/overview") ||
                  pathname?.endsWith("/overview/")
                : pathname === `/docs/${item.slug}` ||
                  pathname === `/docs/${item.slug}/` ||
                  pathname?.endsWith(`/docs/${item.slug}`) ||
                  pathname?.endsWith(`/docs/${item.slug}/`);
              return (
                <Link
                  key={item.slug}
                  href={targetUrl}
                  onClick={() => setMobileOpen(false)}
                  className={`px-nav-link ${active ? "is-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="px-sidebar-bottom">
        <div className="px-sidebar-note">
          <div className="px-sidebar-note-icon"><ShieldCheck size={16} /></div>
          <div><strong>Made to stay local.</strong><span>AI image processing in your browser.</span></div>
        </div>
        <a className="px-back-link" href="/" target="_self"><ArrowLeft size={14} /> Back to Pixelify</a>
      </div>
    </div>
  );

  return (
    <div className={`px-docs ${dark ? "px-dark" : "px-light"}`}>
      {/* GLOBAL DOCS HEADER */}
      <header className="px-header">
        <div className="px-header-left">
          <button
            type="button"
            className="px-header-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open documentation navigation"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <Link href="/" className="px-header-brand" title="Pixelify Docs Overview">
            <Logo size="xs" className="shrink-0 pointer-events-none" />
            <span className="px-header-docs-word">Docs</span>
          </Link>
        </div>

        <div className="px-header-center">
          <button
            type="button"
            className="px-header-search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search documentation"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 px-header-search-icon shrink-0" />
            <span className="px-header-search-placeholder">Search documentation...</span>
            <kbd className="px-header-search-kbd">⌘ K</kbd>
          </button>
        </div>

        <div className="px-header-right">
          <button
            type="button"
            className="px-header-theme-btn"
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          <div className="relative" ref={langRef}>
            <button
              type="button"
              className="px-header-lang-btn"
              onClick={() => setLangOpen(!langOpen)}
              aria-label="Select Language"
              aria-expanded={langOpen}
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
              <span className="font-bold text-xs uppercase tracking-wider">
                {(currentLang || "en").toUpperCase()}
              </span>
              <ChevronDown
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-200 shrink-0 ${langOpen ? "rotate-180" : ""}`}
              />
            </button>

            {langOpen && (
              <div className="px-header-lang-dropdown">
                <div className="px-header-lang-caption">SELECT LANGUAGE</div>
                {SITE_LANGUAGES.map((lang) => {
                  const isSelected = (currentLang || "en") === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      disabled={!lang.active}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`px-header-lang-item ${isSelected ? "is-selected" : ""} ${!lang.active ? "is-disabled" : ""}`}
                    >
                      <span className="px-header-lang-name">{lang.nativeLabel}</span>
                      <span className="px-header-lang-short">{lang.short}</span>
                      {isSelected && <Check size={14} className="text-[#00ff85]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="px-sidebar">{sidebar}</aside>

      {/* MOBILE SIDEBAR OVERLAY */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="px-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              className="px-mobile-sidebar"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-mobile-sidebar-head">
                <Link href="/docs/" className="px-header-brand" onClick={() => setMobileOpen(false)}>
                  <Logo size="xs" className="shrink-0 pointer-events-none" />
                  <span className="px-header-docs-word">Docs</span>
                </Link>
                <button
                  type="button"
                  className="px-close-mobile"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-main">
        <main className="px-content">{children}</main>
        <footer className="px-footer">
          <span>© {new Date().getFullYear()} Pixelify. All rights reserved.</span>
          <span>Made for creators, powered privately by your device.</span>
        </footer>
      </div>

      <PixelMascot pageKey={pathname} searching={searchOpen} />

      {/* SEARCH MODAL */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="px-search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setSearchOpen(false)}
          >
            <motion.div
              className="px-search-modal"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-search-input-wrap">
                <Search size={18} />
                <input
                  autoFocus
                  placeholder="Search guides, tools, and topics..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                  <kbd>ESC</kbd>
                </button>
              </div>
              <div className="px-search-results">
                <div className="px-search-caption">{query ? `${results.length} RESULTS` : "QUICK ACCESS"}</div>
                {results.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/docs/${a.slug}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    className="px-search-result"
                  >
                    <span className="px-result-icon"><BookOpen size={16} /></span>
                    <span><strong>{a.title}</strong><small>{a.description}</small></span>
                    <ArrowRight size={15} />
                  </Link>
                ))}
                {results.length === 0 && <div className="px-no-results">No results found. Try another search.</div>}
              </div>
              <div className="px-search-foot">
                <span><kbd>↵</kbd> to open</span>
                <span><kbd>ESC</kbd> to close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
