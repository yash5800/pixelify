import React from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import type { ViewTab } from '../types';

interface FooterProps {
  onTabChange: (tab: ViewTab) => void;
}

export default function Footer({ onTabChange }: FooterProps) {
  return (
    <footer className="w-full border-t border-white/10 pt-8 sm:pt-10 pb-8 bg-neutral-950/80 backdrop-blur-2xl relative z-10 select-none">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 flex flex-col gap-12 sm:gap-16">

        {/* TOP SECTION: HEADLINE & LINK COLUMNS */}
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:gap-12">
          {/* LEFT HEADLINE */}
          <div className="max-w-sm flex flex-col gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Experience liftoff
            </h2>

            {/* CONTACT & FEEDBACK CALLOUT */}
            <div className="pt-1 sm:pt-2">
              <Link
                href="/contact"
                className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] max-w-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:scale-105 group-hover:bg-white/15 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-semibold text-white group-hover:text-white transition-colors">
                      Share Feedback & Contact
                    </span>
                    <span className="text-[11px] text-muted truncate">
                      Suggestions, issues or ideas? Reach out
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>

          {/* RIGHT LINK COLUMNS */}
          <div className="grid w-full grid-cols-2 gap-x-8 gap-y-8 text-xs sm:grid-cols-3 lg:w-auto lg:grid-cols-4 lg:gap-x-8 xl:gap-x-10">
            <nav aria-label="Product links" className="flex flex-col items-start gap-2.5">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Product</h3>
              <button onClick={() => onTabChange('upscaler')} className="text-left text-muted transition hover:text-white">AI Image Upscaler</button>
              <button onClick={() => onTabChange('bg_remove')} className="text-left text-muted transition hover:text-white">Background Remover</button>
              <Link href="/products" className="text-muted transition hover:text-white">Products &amp; Features</Link>
            </nav>

            <nav aria-label="Resources links" className="flex flex-col items-start gap-2.5">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Resources</h3>
              <Link href="/docs" className="text-muted transition hover:text-white">Docs</Link>
              <button onClick={() => onTabChange('blogs')} className="text-left text-muted transition hover:text-white">Blogs</button>
              <Link href="/#home-faq" className="text-muted transition hover:text-white">FAQs</Link>
              <Link href="/products#requirements" className="text-muted transition hover:text-white">System requirements</Link>
            </nav>

            <nav aria-label="Company and legal links" className="flex flex-col items-start gap-2.5">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Company</h3>
              <Link href="/about" className="text-muted transition hover:text-white">About Pixelify</Link>
              <Link href="/contact" className="text-muted transition hover:text-white">Contact</Link>
              <div className="mt-3 flex flex-col items-start gap-2.5 border-t border-white/10 pt-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Legal</h4>
                <Link href="/privacy" className="text-muted transition hover:text-white">Privacy Policy</Link>
                <Link href="/terms" className="text-muted transition hover:text-white">Terms of Service</Link>
              </div>
            </nav>

            <nav aria-label="Follow links" className="flex flex-col items-start gap-3">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Follow</h3>
              <div className="flex flex-wrap gap-2" aria-label="Social profiles">
                <SocialPlaceholder name="YouTube"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" /></SocialPlaceholder>
                <SocialPlaceholder name="X"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.4L1.9 2h6.4l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.4 3.9H5.6L17.8 20Z" /></SocialPlaceholder>
                <SocialPlaceholder name="Instagram"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 4.2 7v10A2.8 2.8 0 0 0 7 19.8h10a2.8 2.8 0 0 0 2.8-2.8V7A2.8 2.8 0 0 0 17 4.2H7Zm5 2.3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 2.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm5.8-3.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" /></SocialPlaceholder>
                <SocialPlaceholder name="Facebook"><path d="M13.3 22v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.1V14h2.8v8h3.4Z" /></SocialPlaceholder>
                <a href="https://github.com/yash5800/pixelify" target="_blank" rel="noreferrer" aria-label="Pixelify on GitHub" title="GitHub" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition hover:border-white/25 hover:bg-white/10 hover:text-white">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 .297a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.05c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.83 1.24 1.24 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.9 1.24 3.22 0 4.62-2.8 5.65-5.48 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .297Z" /></svg>
                </a>
              </div>
              <a href="https://github.com/yash5800/pixelify/issues" target="_blank" rel="noreferrer" className="text-muted transition hover:text-white">Issues &amp; ideas</a>
            </nav>
          </div>
        </div>

        {/* MIDDLE SECTION: GIANT BRAND NAME (NO WHITE BORDER LINE ON TOP) */}
        <div className="w-full text-center py-1 sm:py-2 border-b border-white/5 overflow-hidden">
          <h1 className="footer-giant-title">
            PIXELIFY
          </h1>
        </div>

        {/* BOTTOM SECTION: BRAND MARK & COPYRIGHT */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
            <span className="font-bold text-white font-sans text-sm">Pixelify AI Studio</span>
            <span>© 2026 Pixelify Inc. All rights reserved.</span>
          </div>

        </div>

      </div>
    </footer>
  );
}

function SocialPlaceholder({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <span role="img" aria-label={`${name} social link coming soon`} title={`${name} link coming soon`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted/70">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">{children}</svg>
    </span>
  );
}
