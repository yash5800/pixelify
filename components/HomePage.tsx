// HomePage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import Footer from './Footer';
import TruckScene from './TruckSceneClient';
import type { ViewTab } from '../types';
import Hero from "./Hero";
import PixelifyStory from './PixelifyStory';
import BGRemoverSection from './BGRemoverSection';
import AIUpscalerSection from './AIUpscalerSection';
import WhyChoosePixelify from './WhyChoosePixelify';
import HomeFaq from './HomeFaq';
import Testimonials from "./TestimonialsSection";
import HomeDemo from './HomeDemo';
import '@/styles/home.css';
interface HomePageProps {
  onLaunchUpscaler: () => void;
  onLaunchBGRemove: () => void;
  onSelectSample: (sampleUrl: string, type: 'upscale' | 'bg_remove') => void;
  onTabChange: (tab: ViewTab) => void;
}

export default function HomePage({
  onLaunchUpscaler,
  onLaunchBGRemove,
  onSelectSample,
  onTabChange,
}: HomePageProps) {
  return (
    <div className="relative min-h-screen bg-[#050507] text-white">

      {/* ========================================================================= */}
      {/* HERO SECTION AT FULL VIEWPORT SCREEN WIDTH (100VW) */}
      {/* ========================================================================= */}
      <Hero
        onLaunchUpscaler={onLaunchUpscaler}
        onLaunchBGRemove={onLaunchBGRemove}
      />

      <div id="home-content" className="flex flex-col gap-10 sm:gap-16 pt-6 sm:pt-12 pb-12 max-w-7xl mx-auto px-3 sm:px-6 relative z-10">

        {/* ========================================================================= */}
        {/* DUAL POPPED WORKSPACE CARDS ("CHOOSE YOUR STUDIO" - reference.mp4 style) */}
        {/* ========================================================================= */}
        <section className="flex flex-col gap-8 sm:gap-10">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto flex flex-col gap-3 px-2"
          >
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#00FF85]">
              Choose Your Studio
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              AI Tools for Every Image
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-neutral-400">
              Pick the workstation built specifically for your image processing needs.
            </p>
          </motion.div>

          <div className="flex flex-col gap-0 relative">

            {/* ROW 1: NEURAL BACKGROUND REMOVER WORKSTATION (REFERENCE UI) */}
            <BGRemoverSection onLaunchBGRemove={onLaunchBGRemove} />

            {/* ROW 2: AI UPSCALER STUDIO (REFERENCE UI WITH SPIDERMAN CARDS) */}
            <AIUpscalerSection onLaunchUpscaler={onLaunchUpscaler} />

            {/* ROW 3: WHY CHOOSE PIXELIFY (CURVED BACKGROUND LIKE BGREMOVER) */}

            <WhyChoosePixelify />

          </div>
        </section>

        {/* ========================================================================= */}
        {/* PixelifyStory
        {/* ========================================================================= */}


        <PixelifyStory />


        {/* ========================================================================= */}
        {/* TESTIMONIALS SECTION (WHITE BG WITH ROUNDED CORNERS) */}
        {/* ========================================================================= */}

        <Testimonials />

        {/* ========================================================================= */}
        {/* INSTANT DEMOS GRID */}
        {/* ========================================================================= */}
        <HomeDemo onSelectSample={onSelectSample} />

        {/* ========================================================================= */}
        {/* FAQ (SAME DESIGN AS WORKSPACES, WITH WHITE BG AND ROUNDED CORNERS) */}
        {/* ========================================================================= */}
        <HomeFaq />

      </div>

      {/* ========================================================================= */}
      {/* 3D TRUCK SCENE AT FULL DEVICE VIEWPORT WIDTH (EDGE-TO-EDGE) */}
      {/* ========================================================================= */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative w-full overflow-hidden my-4 sm:my-8"
      >
        <TruckScene />
      </motion.section>

      {/* FOOTER */}
      <Footer onTabChange={onTabChange} />
    </div>
  );
}
