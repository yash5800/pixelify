import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';

/**
 * Replace the sample review copy and names below with real, permissioned feedback
 * before publishing. These are starter examples, not verified customer reviews.
 */
const testimonials = [
  {
    name: 'Elena Rostova',
    role: 'Lead Retoucher & Fashion Director',
    initials: 'ER',
    tone: 'from-emerald-600 to-teal-800',
    quote: 'The interface is refreshingly simple. I can clean up an image and get back to the actual project without digging through menus.',
    context: 'Background remover',
  },
  {
    name: 'David Chen',
    role: 'Product Designer at TechCorp',
    initials: 'DC',
    tone: 'from-blue-600 to-indigo-800',
    quote: 'I like having the image tools together in one place. The workflow feels clear, and I know what to do next at every step.',
    context: 'Everyday image editing',
  },
  {
    name: 'Eleven JH',
    role: 'Online seller',
    initials: 'EJ',
    tone: 'from-amber-600 to-orange-800',
    quote: 'Product photos are a regular task for me. A focused tool that gets me to a clean result quickly is exactly what I need.',
    context: 'Product images',
  },
  {
    name: 'Shimazu Koji',
    role: 'Digital artist',
    initials: 'SK',
    tone: 'from-purple-600 to-violet-900',
    quote: 'The local-first approach is a welcome touch. I prefer tools that give me more control over the files I am working with.',
    context: 'Privacy-minded workflow',
  },
  {
    name: 'Joséphine Dupont',
    role: 'Content creator',
    initials: 'JD',
    tone: 'from-rose-600 to-pink-800',
    quote: 'The experience feels lightweight and direct. I can focus on the image instead of learning a complicated editor.',
    context: 'Creator workflow',
  },
  {
    name: 'Seong Gi-hun',
    role: 'Freelance designer',
    initials: 'SG',
    tone: 'from-emerald-700 to-cyan-900',
    quote: 'I appreciate having quick image utilities that fit into the rest of my workflow rather than slowing it down.',
    context: 'Creative workflow',
  },
];

export default function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);

  const updateArrows = () => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanGoBack(track.scrollLeft > 10);
    setCanGoForward(track.scrollLeft < maxScroll - 10);
  };

  useEffect(() => {
    updateArrows();
    const handleResize = () => updateArrows();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('[data-testimonial-card]');
    const gap = 20;
    const distance = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * distance, behavior: 'smooth' });
    window.setTimeout(updateArrows, 400);
  };

  return (
    <section className="pixelify-testimonials-wrap w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2 overflow-hidden my-4 sm:my-8">
      <div className="pixelify-testimonials-panel w-full overflow-hidden rounded-[28px] sm:rounded-[44px] bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <span className="pixelify-testimonial-eyebrow">THE WORD IS OUT</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-neutral-950 leading-[1.12]">
              Loved by digital artists,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-500 to-[#00C86A]">
                studios & developers
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed mt-2">
              Real creators sharing why they ditched cloud subscription models for fast, private in-browser neural processing.
            </p>
          </motion.div>
        </div>

        {/* ========================================================================= */}
        {/* CAROUSEL VIEWPORT WITH FADED CARD ARROW OVERLAYS                          */}
        {/* ========================================================================= */}
        <div className="pixelify-testimonial-viewport relative mx-auto mt-9 max-w-7xl sm:mt-12">
          {/* POPPING LEFT ARROW (Appears after going to the right) */}
          <AnimatePresence>
            {canGoBack && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.6, x: -16 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6, x: -16 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                onClick={() => move(-1)}
                className="absolute left-2 sm:left-4 lg:left-6 top-1/2 -translate-y-1/2 z-30 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white text-neutral-900 border border-neutral-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.16)] flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-black hover:text-white hover:border-black hover:scale-105 active:scale-95"
                aria-label="Scroll to previous reviews"
              >
                <ChevronLeft size={12} strokeWidth={2.4} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* LEFT GRADIENT FADE (Reveals when scrolled right) */}
          <AnimatePresence>
            {canGoBack && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 lg:w-36 z-20 bg-gradient-to-r from-white via-white/80 to-transparent"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          {/* CAROUSEL TRACK */}
          <div
            ref={trackRef}
            onScroll={updateArrows}
            className="pixelify-testimonial-track flex gap-5 overflow-x-auto scroll-smooth pb-3"
            aria-label="Customer testimonials"
          >
            {testimonials.map((item, index) => (
              <motion.article
                key={`${item.initials}-${index}`}
                data-testimonial-card
                className="pixelify-testimonial-card flex shrink-0 flex-col"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.2) }}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white bg-gradient-to-br shadow-sm shrink-0 ${item.tone}`} aria-hidden="true">
                    {item.initials}
                  </span>
                  <Quote size={23} className="text-neutral-300" aria-hidden="true" />
                </div>
                <p className="mt-4 flex-1 text-[15px] leading-7 text-neutral-700">“{item.quote}”</p>
                <div className="mt-6 pt-4">
                  <div className="font-semibold text-neutral-950">{item.name}</div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                    <span>{item.role}</span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1">{item.context}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* RIGHT GRADIENT FADE (Overlays 4th card with smooth gradient) */}
          <AnimatePresence>
            {canGoForward && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 sm:w-40 lg:w-52 z-20 bg-gradient-to-l from-white via-white/85 to-transparent"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          {/* RIGHT ARROW (Positioned directly over the faded card, hover bg black & text white) */}
          <AnimatePresence>
            {canGoForward && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.6, x: 16 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6, x: 16 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                onClick={() => move(1)}
                className="absolute right-2 sm:right-4 lg:right-6 top-1/2 -translate-y-1/2 z-30 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white text-neutral-900 border border-neutral-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.16)] flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-black hover:text-white hover:border-black hover:scale-105 active:scale-95"
                aria-label="Scroll to more reviews"
              >
                <ChevronRight size={12} strokeWidth={2.4} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
