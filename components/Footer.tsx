import React from 'react';
import Link from 'next/link';
import type { ViewTab } from '../types';

interface FooterProps {
  onTabChange: (tab: ViewTab) => void;
}

export default function Footer({ onTabChange }: FooterProps) {
  return (
    <footer className="w-full border-t border-white/10 pt-12 sm:pt-16 pb-28 md:pb-12 bg-neutral-950/80 backdrop-blur-2xl relative z-10 select-none">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 flex flex-col gap-12 sm:gap-16">

        {/* TOP SECTION: HEADLINE & LINK COLUMNS */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-10 md:gap-12">
          {/* LEFT HEADLINE */}
          <div className="max-w-sm flex flex-col gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Experience liftoff
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              State-of-the-art local AI super-resolution and neural background cutouts running 100% private in your browser via WebGPU & WASM.
            </p>
          </div>

          {/* RIGHT LINK COLUMNS */}
          <div className="grid grid-cols-2 gap-8 sm:gap-20 w-full sm:w-auto">
            {/* PRODUCT COLUMN */}
            <div className="flex flex-col gap-3 text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] mb-1">
                Product
              </span>
              <button onClick={() => onTabChange('upscaler')} className="text-left text-muted hover:text-white transition">
                AI Image Upscaler
              </button>
              <button onClick={() => onTabChange('bg_remove')} className="text-left text-muted hover:text-white transition">
                Background Remover
              </button>
              <a href="#models" onClick={(e) => { e.preventDefault(); onTabChange('upscaler'); }} className="text-muted hover:text-white transition">
                Alpha-Satoru Model
              </a>
              <a href="#chopper" onClick={(e) => { e.preventDefault(); onTabChange('bg_remove'); }} className="text-muted hover:text-white transition">
                Chopper Neural Cutouts
              </a>
              <a href="#webgpu" onClick={(e) => e.preventDefault()} className="text-muted hover:text-white transition">
                WebGPU Acceleration
              </a>
            </div>

            {/* RESOURCES COLUMN */}
            <div className="flex flex-col gap-3 text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] mb-1">
                Resources
              </span>
              <a href="#docs" onClick={(e) => e.preventDefault()} className="text-muted hover:text-white transition">
                Documentation & FAQs
              </a>
              <a href="#benchmarks" onClick={(e) => e.preventDefault()} className="text-muted hover:text-white transition">
                WebGPU Benchmarks
              </a>
              <button onClick={() => onTabChange('blogs')} className="text-left text-muted hover:text-white transition">
                Blog & Guides
              </button>
              <Link href="/privacy" className="text-muted hover:text-white transition">
                100% Privacy Guarantee
              </Link>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="text-muted hover:text-white transition">
                GitHub Repository
              </a>
              <a href="#changelog" onClick={(e) => e.preventDefault()} className="text-muted hover:text-white transition">
                Changelog v2.0
              </a>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: GIANT BRAND NAME AS IN REFERENCE IMAGE */}
        <div className="w-full text-center py-4 sm:py-6 border-t border-b border-white/5 overflow-hidden">
          <h1 className="footer-giant-title">
            PIXELIFY
          </h1>
        </div>

        {/* BOTTOM SECTION: BRAND MARK & LEGAL LINKS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted pt-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
            <span className="font-bold text-white font-sans text-sm">Pixelify AI Studio</span>
            <span>© 2026 Pixelify Inc. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2 font-medium">
            <Link href="/about" className="hover:text-white transition">
              About Pixelify
            </Link>
            <Link href="/products" className="hover:text-white transition">
              Pixelify Products
            </Link>
            <button onClick={() => onTabChange('blogs')} className="hover:text-white transition cursor-pointer">
              Blogs
            </button>
            <Link href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
