'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { WifiOff, Wifi, CheckCircle2, X } from 'lucide-react';

interface OfflineNoticeBannerProps {
  isOnline: boolean;
  justReconnected: boolean;
  isOpen: boolean;
  onDismiss: () => void;
}

export default function OfflineNoticeBanner({
  isOnline,
  justReconnected,
  isOpen,
  onDismiss,
}: OfflineNoticeBannerProps) {
  const prefersReducedMotion = useReducedMotion();

  // If online and not in the brief reconnected state, hide completely
  if (isOnline && !justReconnected) return null;
  if (!isOpen && !justReconnected) return null;

  return (
    <AnimatePresence>
      {/* RECONNECTED BANNER */}
      {justReconnected ? (
        <motion.div
          key="reconnected-banner"
          initial={prefersReducedMotion ? false : { opacity: 0, y: -16, x: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="fixed top-18 sm:top-20 right-4 sm:right-6 z-[75] w-auto max-w-[280px] pointer-events-auto"
        >
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#09150E]/95 border border-[#00FF85]/35 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,133,0.12)] backdrop-blur-xl">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00FF85]/20 text-[#00FF85]">
              <Wifi className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-[11.5px] font-bold text-white flex items-center gap-1 leading-tight">
                Connection Restored
              </span>
              <span className="text-[10px] text-[#A8B2AB] leading-tight">
                You are back online.
              </span>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 -mr-0.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        /* OFFLINE REASSURANCE BANNER */
        <motion.aside
          key="offline-banner"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          role="alert"
          aria-label="Offline mode notice"
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[65] max-w-md w-[calc(100%-2rem)] pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0F1117]/95 p-4 sm:p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {/* Ambient warm glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl"
            />

            <div className="relative flex items-start gap-3.5">
              {/* Icon badge */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-inner"
                aria-hidden="true"
              >
                <WifiOff className="h-5 w-5" strokeWidth={2} />
              </div>

              {/* Message */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      The internet left. We stayed.
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    aria-label="Dismiss offline banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-1.5 text-xs leading-relaxed text-[#A9B1BD]">
                  Pixelify runs entirely on your device. You can keep upscaling images and removing backgrounds without an internet connection or cloud data transfers.
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#00FF85] flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00FF85] animate-pulse" />
                    On-Device AI Active
                  </span>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
