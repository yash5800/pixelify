'use client';

// HomePage.tsx
import React, { useEffect } from 'react';
import Footer from './Footer';
import type { ViewTab } from '../types';
import Hero from './Hero';
import { CustomerLogos } from './home/CustomerLogos';
import { StudioIntro } from './home/StudioIntro';
import { WorkflowSection } from './home/WorkflowSection';
import { PlatformBento } from './home/PlatformBento';
import { ResultsGallery } from './home/ResultsGallery';
import { TruckHero } from './home/TruckHero';
import { ProofSection } from './home/ProofSection';
import { StudioMarketplace } from './home/StudioMarketplace';
import { FinalCta } from './home/FinalCta';
import '@/styles/home.css';
import '@/styles/framer-home.css';
import '@/styles/truck-hero.css';

interface HomePageProps {
  onLaunchUpscaler: () => void;
  onLaunchBGRemove: () => void;
  onSelectSample: (sampleUrl: string, type: 'upscale' | 'bg_remove') => void;
  onTabChange: (tab: ViewTab) => void;
}

export default function HomePage({
  onLaunchUpscaler,
  onLaunchBGRemove,
  onTabChange,
}: HomePageProps) {
  // Sections are client rendered, so the browser's own hash jump lands before
  // the anchor exists. Re-run it once the page has painted.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      target?.scrollIntoView({ block: 'start' });
    }, 400);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#090909] text-white fh-page">
      <Hero
        onLaunchUpscaler={onLaunchUpscaler}
        onLaunchBGRemove={onLaunchBGRemove}
      />

      <div id="home-content" className="relative z-10">
        <CustomerLogos />
        <StudioIntro />
        <WorkflowSection />
        <PlatformBento />
        <ResultsGallery />
        <TruckHero />
        <ProofSection />
        <StudioMarketplace />
        <FinalCta />
      </div>

      <Footer onTabChange={onTabChange} />
    </div>
  );
}
