'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Download } from 'lucide-react';
import type { ModelDownloadItem } from '../types';

/**
 * Navbar download indicator. Rendered only while a model is actually
 * downloading (first-time automatic cache fill or a manual load); once every
 * model is available the icon is not rendered at all. The badge shows how
 * many model downloads remain; clicking opens a live panel with one
 * progress bar per model and a "left" count.
 */
export default function ModelDownloadIndicator({ items }: { items: ModelDownloadItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Every model just finished: drop the panel with it (icon disappears too).
  useEffect(() => {
    if (!items.length) setOpen(false);
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${items.length} AI model${items.length === 1 ? '' : 's'} downloading`}
        aria-label={`Model downloads in progress: ${items.length}`}
        className="relative flex w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl text-white items-center justify-center transition-all shadow-xl active:scale-95"
      >
        <Download size={19} className="relative text-gray-300" />

        {/* COUNT BADGE: how many model downloads remain */}
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#00FF85] text-[#052012] text-[10.5px] font-black flex items-center justify-center border border-black/40 shadow-[0_0_10px_rgba(0,255,133,0.45)]"
        >
          {items.length}
        </span>
      </button>

      {open && items.length > 0 && (
        <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-[#121218] border border-white/15 p-3.5 shadow-2xl z-50 animate-fade-in flex flex-col gap-3">
          <div className="px-1 py-0.5 border-b border-white/10 flex items-center justify-between gap-2 text-xs font-bold text-white pb-2">
            <span>Downloading AI models</span>
            <span className="font-mono text-[10px] font-bold text-[#00FF85]">
              {items.length} LEFT
            </span>
          </div>

          {items.map((item) => (
            <div key={item.id} className="px-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-neutral-200 truncate pr-2">{item.name}</span>
                <span className="font-mono text-[10px] font-bold text-neutral-400">
                  {item.progress}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#00FF85] to-[#72FFB4]"
                  initial={false}
                  animate={{ width: `${Math.max(2, Math.min(100, item.progress))}%` }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}

          <p className="px-1 text-[9.5px] leading-relaxed text-neutral-600">
            Saved in your browser cache and reused automatically on your next visit.
          </p>
        </div>
      )}
    </div>
  );
}
