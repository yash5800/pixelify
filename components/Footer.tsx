import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, ArrowRight } from 'lucide-react';
import type { ViewTab } from '../types';
import { useTranslation } from '../locales';
import { useApp } from './AppProvider';
import { SITE_LANGUAGES } from '../lib/i18n';

interface FooterProps {
  onTabChange: (tab: ViewTab) => void;
}

export default function Footer({ onTabChange }: FooterProps) {
  const { t } = useTranslation();
  const { currentLang } = useApp();
  const pathname = usePathname();

  const getLangHref = (path: string) => {
    let clean = path.replace(/^\//, '');
    let hash = '';
    const hashIndex = clean.indexOf('#');
    if (hashIndex !== -1) {
      hash = clean.slice(hashIndex);
      clean = clean.slice(0, hashIndex);
    }

    let prefix = '';
    if (pathname) {
      const segs = pathname.replace(/^\//, '').split('/').filter(Boolean);
      if (segs[0] && SITE_LANGUAGES.some((l) => l.code === segs[0])) {
        prefix = `/${segs[0]}`;
      }
    }
    if (!prefix && currentLang && currentLang !== 'en') {
      prefix = `/${currentLang}`;
    }

    if (clean === '') {
      return prefix ? `${prefix}/${hash}` : `/${hash}`;
    }
    return prefix ? `${prefix}/${clean}/${hash}` : `/${clean}/${hash}`;
  };

  return (
    <div className="w-full">
      {/* PRODUCT HUNT UPVOTE BADGE */}
      <div className="w-full flex items-center justify-center px-5 pb-8 pt-2">
        <a
          href="https://www.producthunt.com/products/pixelify-ai-photo-editor?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-pixelify-3"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
        >
          <img
            alt="Pixelify - AI Image Editing. Private, Free, and Right in Your Browser. | Product Hunt"
            width={250}
            height={54}
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1330564&theme=neutral&t=1795703933067"
            className="block h-[54px] w-[250px]"
          />
        </a>
      </div>

      <footer className="w-full border-t border-white/10 pt-8 sm:pt-10 pb-8 sm:pb-10 bg-neutral-950/80 backdrop-blur-2xl relative z-10 select-none">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 flex flex-col gap-14 sm:gap-20">

        {/* TOP SECTION: HEADLINE & LINK COLUMNS */}
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:gap-12">
          {/* LEFT HEADLINE */}
          <div className="max-w-sm flex flex-col gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {t.footer.slogan}
            </h2>

            {/* CONTACT & FEEDBACK CALLOUT */}
            <div className="pt-1 sm:pt-2">
              <Link
                href={getLangHref('/contact')}
                className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] max-w-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:scale-105 group-hover:bg-white/15 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[15px] sm:text-[14.5px] font-semibold text-white group-hover:text-white transition-colors">
                      {t.footer.feedbackTitle}
                    </span>
                    <span className="text-[11px] text-muted truncate">
                      {t.footer.feedbackDesc}
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
          <div className="grid w-full grid-cols-2 gap-x-8 gap-y-8 text-[15px] sm:text-[14.5px] sm:grid-cols-3 lg:w-auto lg:grid-cols-4 lg:gap-x-8 xl:gap-x-10">
            <nav aria-label="Product links" className="flex flex-col items-start gap-2.5">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">{t.footer.productCol}</h3>
              <button onClick={() => onTabChange('upscaler')} className="text-left text-muted transition hover:text-white">{t.footer.upscaler}</button>
              <button onClick={() => onTabChange('bg_remove')} className="text-left text-muted transition hover:text-white">{t.footer.bgRemover}</button>
              <Link href={getLangHref('/products')} className="text-muted transition hover:text-white">{t.footer.products}</Link>
            </nav>

            <nav aria-label="Resources links" className="flex flex-col items-start gap-2.5">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">{t.footer.resourcesCol}</h3>
              <Link href={getLangHref('/docs')} className="text-muted transition hover:text-white">{t.footer.docs}</Link>
              <button onClick={() => onTabChange('blog')} className="text-left text-muted transition hover:text-white">{t.footer.blog}</button>
              <Link href={getLangHref('/#home-faq')} className="text-muted transition hover:text-white">{t.footer.faqs}</Link>
              <Link href={getLangHref('/leaderboard')} className="text-muted transition hover:text-white">Leaderboard</Link>
            </nav>

            <nav aria-label="Company and legal links" className="flex flex-col items-start gap-2.5">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">{t.footer.companyCol}</h3>
              <Link href={getLangHref('/about')} className="text-muted transition hover:text-white">{t.footer.about}</Link>
              <Link href={getLangHref('/contact')} className="text-muted transition hover:text-white">{t.footer.contact}</Link>
              <div className="mt-3 flex flex-col items-start gap-2.5 pt-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">{t.footer.legalCol}</h4>
                <Link href={getLangHref('/privacy')} className="text-muted transition hover:text-white">{t.footer.privacy}</Link>
                <Link href={getLangHref('/terms')} className="text-muted transition hover:text-white">{t.footer.terms}</Link>
              </div>
            </nav>

            <nav aria-label="Follow links" className="flex flex-col items-start gap-3">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-white">{t.footer.followCol}</h3>
              <div className="flex flex-wrap gap-2" aria-label="Social profiles">
                <SocialIcon href="https://www.youtube.com/@pixelify-1" name="YouTube">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
                </SocialIcon>
                <SocialIcon href="https://x.com/pixelify_hq" name="X">
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.4L1.9 2h6.4l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.4 3.9H5.6L17.8 20Z" />
                </SocialIcon>
                <SocialIcon href="https://www.instagram.com/officialpixelify/#" name="Instagram">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 4.2 7v10A2.8 2.8 0 0 0 7 19.8h10a2.8 2.8 0 0 0 2.8-2.8V7A2.8 2.8 0 0 0 17 4.2H7Zm5 2.3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 2.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm5.8-3.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" />
                </SocialIcon>
                <SocialIcon href="https://www.facebook.com/profile.php?id=61596919383230#" name="Facebook">
                  <path d="M13.3 22v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.1V14h2.8v8h3.4Z" />
                </SocialIcon>
                <SocialIcon href="https://www.threads.com/@officialpixelify" name="Threads">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32l-1.757-1.182c.98-1.454 2.513-2.259 4.479-2.259h.041c3.191.02 5.091 2.005 5.284 5.565.115.051.228.104.34.16 1.425.716 2.49 1.78 3.083 3.077.772 1.688.855 4.44-1.455 6.7-1.838 1.8-4.053 2.587-7.177 2.612Zm.96-8.981c-.465-.035-.93-.035-1.394.008-1.693.097-2.67.926-2.616 1.936.046.847.927 1.773 2.755 1.674 1.659-.09 2.952-.975 3.175-3.428a9.86 9.86 0 0 0-1.92-.19Z" />
                </SocialIcon>
                <SocialIcon href="https://medium.com/@officialpixelify" name="Medium">
                  <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12Zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42Zm2.94 0c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75c.66 0 1.19 2.58 1.19 5.75Z" />
                </SocialIcon>
              </div>
            </nav>
          </div>
        </div>

        {/* MIDDLE SECTION: GIANT BRAND NAME (NO WHITE BORDER LINE ON TOP) */}
        <div className="w-full text-center py-3 sm:py-5 border-b border-white/5">
          <h1 className="footer-giant-title">
            PIXELIFY
          </h1>
        </div>

        {/* BOTTOM SECTION: BRAND MARK & COPYRIGHT */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
            <span className="font-bold text-white font-sans text-sm">Pixelify</span>
            <span>{t.footer.rights || (t.footer as any).copyright}</span>
          </div>

        </div>
      </div>
      </footer>
    </div>
  );
}

function SocialIcon({
  href,
  name,
  children,
}: {
  href: string;
  name: string;
  children: React.ReactNode;
}) {
  const isPlaceholder = !href || href === '/';

  if (isPlaceholder) {
    return (
      <Link
        href={href || '/'}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} social link coming soon`}
        title={`${name} link coming soon`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted/70 transition hover:border-white/20 hover:text-white/80"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          {children}
        </svg>
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      title={name}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        {children}
      </svg>
    </a>
  );
}