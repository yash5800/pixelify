import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollToTopButtonProps {
  threshold?: number;
}

export default function ScrollToTopButton({ threshold = 280 }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setIsVisible(scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.7, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/85 dark:bg-[#12141A]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 hover:border-[#00FF85] shadow-2xl hover:shadow-[0_0_22px_rgba(0,255,133,0.45)] text-slate-200 hover:text-[#00FF85] transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85]"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5 text-[#00FF85]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
