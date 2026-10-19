import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThinkingOrb } from 'thinking-orbs';
import { useApp } from './AppProvider';

gsap.registerPlugin(SplitText, ScrollTrigger);

interface PixelifyHeroProps {
  onLaunchUpscaler: () => void;
  onLaunchBGRemove: () => void;
}

export default function PixelifyHero({
  onLaunchUpscaler,
  onLaunchBGRemove,
}: PixelifyHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const { warmup } = useApp();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const htElements = Array.from(
      root.querySelectorAll<HTMLElement>('.headline .ht')
    );
    const poweredEl = root.querySelector<HTMLElement>('.word-powered');
    const pixelifyEl = root.querySelector<HTMLElement>('.ai-token');

    const splits = htElements
      .map((el) => {
        const split = SplitText.create(el, {
          type: 'chars',
        });

        // Set per-character gradient colors so that opacity animations
        // work natively on individual characters without background-clip mask issues
        if (el === poweredEl) {
          el.classList.add('is-split');
          split.chars.forEach((char, i, arr) => {
            const htmlChar = char as HTMLElement;
            const alpha = 0.25 + 0.75 * (i / Math.max(1, arr.length - 1));
            htmlChar.style.color = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            htmlChar.style.webkitTextFillColor = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          });
        }

        if (el === pixelifyEl) {
          el.classList.add('is-split');
          split.chars.forEach((char, i, arr) => {
            const htmlChar = char as HTMLElement;
            const alpha = 1.0 - 0.75 * (i / Math.max(1, arr.length - 1));
            htmlChar.style.color = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            htmlChar.style.webkitTextFillColor = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          });
        }

        return split;
      })
      .filter((split) => split.chars.length > 0);

    const allChars = splits.flatMap((split) => split.chars);

    if (!allChars.length) return;

    const ctx = gsap.context(() => {
      const reveal = gsap.fromTo(
        allChars,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          ease: 'none',
          duration: 1.25,
          delay: 0.1,
          stagger: {
            each: 0.025,
            from: 'random',
          },
          scrollTrigger: {
            trigger: root.querySelector('.headline'),
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      const glyphFade = gsap.from(
        [
          ...root.querySelectorAll<HTMLElement>(
            '.glow-wrap, .spark, .plus'
          ),
        ],
        {
          opacity: 0,
          ease: 'none',
          duration: 1.2,
          delay: 0.1,
        }
      );

      const entrance = gsap.from(
        [
          ...root.querySelectorAll<HTMLElement>(
            '.sub, .hero-actions, .hero-scroll-wrap'
          ),
        ],
        {
          opacity: 0,
          y: 20,
          ease: 'power2.out',
          duration: 0.9,
          stagger: 0.12,
          delay: 1.05,
          scrollTrigger: {
            trigger: root,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      if (process.env.NODE_ENV !== 'production') {
        (
          window as unknown as {
            __pixelifyHero?: {
              replay: () => void;
            };
          }
        ).__pixelifyHero = {
          replay: () => {
            reveal.restart();
            glyphFade.restart();
            entrance.restart();
          },
        };
      }
    }, root);

    return () => {
      ctx.revert();
      splits.forEach((split) => {
        try {
          split.revert();
        } catch {
          // ignore
        }
      });
      poweredEl?.classList.remove('is-split');
      pixelifyEl?.classList.remove('is-split');
    };
  }, []);

  const handleScrollDown = () => {
    const target = document.getElementById('home-content');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  return (
    <section
      className="hero pixelify-hero"
      ref={rootRef}
    >
      {/* Background Video */}
      <div className="hero-video-wrap" aria-hidden="true">
        <video
          className="hero-bg-video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/upscaled-video.mp4" type="video/mp4" />
        </video>
        <div className="hero-video-overlay" />
      </div>

      <div className="hero-inner">

        <div className="hero-top-group">
          {/* =====================================================
              STAIRCASE HEADLINE
              ===================================================== */}

          <h1
            className="headline"
            aria-label="Your images, your device, your control, powered by Pixelify"
          >
            {/* FIRST 3 LINES: YOUR + [IMAGES / DEVICE / CONTROL] */}
            <span className="hero-trio-row">
              <span className="hero-trio-wrap">
                <span className="hero-serif-your dim-3">
                  <span className="ht">YOUR</span>
                </span>
                <span className="hero-trio-stack">
                  <span className="hero-stack-item dim-2">
                    <span className="ht">images</span>
                  </span>
                  <span className="hero-stack-item dim-2">
                    <span className="ht">device</span>
                  </span>
                  <span className="hero-stack-item dim-2">
                    <span className="ht">control</span>
                  </span>
                </span>
              </span>
            </span>

            {/* LINE 4 */}
            <span className="line bright step-4">
              <span className="step-4-row" aria-hidden="true">
                <span className="ht word-powered">
                  powered
                </span>
                <span className="ht">
                  by
                </span>
                <span className="glow-wrap">
                  <ThinkingOrb
                    state="solving"
                    size={64}
                  />
                </span>
                <span className="ht ai-token">
                  Pixelify
                </span>
              </span>
            </span>
          </h1>

          {/* SUBTITLE */}
          <p className="sub">
            Upscale, restore, and transform your images locally,
            directly in your browser. No uploads. No cloud processing.
          </p>

          {/* ACTIONS */}
          <div className="hero-actions">
            <button
              type="button"
              className="hero-secondary"
              onClick={onLaunchBGRemove}
              onMouseEnter={() => warmup('bg_remove')}
              onTouchStart={() => warmup('bg_remove')}
            >
              Launch BG Remover
              <span>↗</span>
            </button>

            <button
              type="button"
              className="hero-secondary"
              onClick={onLaunchUpscaler}
              onMouseEnter={() => warmup('upscaler')}
              onTouchStart={() => warmup('upscaler')}
            >
              Launch AI Upscaler
              <span>↗</span>
            </button>

          </div>
        </div>

        {/* SCROLL DOWN INDICATOR */}
        <div className="hero-scroll-wrap">
          <button
            type="button"
            className="hero-scroll-btn group"
            onClick={handleScrollDown}
            aria-label="Scroll down to studio options"
          >
            <span className="hero-scroll-text">SCROLL</span>
            <div className="hero-scroll-pill">
              <span className="hero-scroll-dot" />
            </div>
          </button>
        </div>

      </div>
    </section>
  );
}