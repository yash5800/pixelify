'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const STORAGE_KEY = 'pixelify_cookie_notice_ack';

/**
 * Bottom cookie notice. Shown once per browser until the user taps
 * "Done" (persisted in local storage). Deliberately generic: states that
 * the site uses cookies in the visitor's browser and links to the full
 * privacy policy — it does not enumerate third parties.
 */
export default function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== 'true') setVisible(true);
    } catch {
      /* storage unavailable: show the notice, it simply won't persist */
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDone = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* already hidden for this visit */
    }
  };

  return (
    <motion.aside
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.8 }}
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-[#0C0E12]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <p className="text-[13px] leading-relaxed text-white/75">
        This site uses cookies and similar browser storage in your browser to remember your
        preferences and to keep the site running smoothly. See our{' '}
        <a
          href="/privacy/"
          className="font-medium text-[#A4D641] underline-offset-4 hover:underline"
        >
          privacy policy
        </a>
        .
      </p>
      <button
        type="button"
        onClick={handleDone}
        className="w-full shrink-0 transform-gpu rounded-xl bg-[#00FF85] px-5 py-2.5 text-[13px] font-bold text-[#07140C] shadow-[0_2px_12px_rgba(0,255,133,0.15)] transition-all duration-200 hover:bg-[#72FFB4] active:scale-[0.98] sm:w-auto"
      >
        Done
      </button>
    </motion.aside>
  );
}
