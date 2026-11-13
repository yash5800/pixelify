'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Lock, ShieldCheck } from 'lucide-react';
import { Reveal } from './Reveal';
import { ImageCompare } from './ImageCompare';

interface MiniRow {
  label: string;
  status: string;
  meta: string;
}

interface MiniTab {
  key: string;
  label: string;
  rows: MiniRow[];
}

/** The model card's three panes: the list, the record shape, and the run log. */
const MODEL_TABS: MiniTab[] = [
  {
    key: 'models',
    label: 'Models',
    rows: [
      { label: 'Vitality', status: 'Loaded', meta: '1.9 MB' },
      { label: 'Pixel-Dance', status: 'Ready', meta: '66.9 MB' },
      { label: 'Alpha-Satoru', status: 'Ready', meta: '67.1 MB' },
      { label: 'Chopper', status: 'Ready', meta: '40 MB' },
      { label: 'Diablo', status: 'Ready', meta: 'On demand' },
    ],
  },
  {
    key: 'fields',
    label: 'Fields',
    rows: [
      { label: 'model', status: 'text', meta: 'required' },
      { label: 'scale', status: 'int', meta: '2 · 4 · 8' },
      { label: 'sharpness', status: 'int', meta: '0 – 100' },
      { label: 'denoise', status: 'int', meta: '0 – 100' },
      { label: 'seed', status: 'int', meta: 'random' },
    ],
  },
  {
    key: 'runs',
    label: 'Runs',
    rows: [
      { label: 'Run 4821', status: 'Done', meta: '1.2 s' },
      { label: 'Run 4820', status: 'Done', meta: '8× · tiled' },
      { label: 'Run 4819', status: 'Cached', meta: '0.0 s' },
      { label: 'Run 4818', status: 'Done', meta: '2× · instant' },
      { label: 'Run 4817', status: 'Done', meta: 'Cutout' },
    ],
  },
];

/** The design card's panes: the layer stack, the type scale and the effects. */
const DESIGN_TABS: MiniTab[] = [
  {
    key: 'design',
    label: 'Design',
    rows: [
      { label: 'Heading · 44 px', status: 'Text', meta: 'visible' },
      { label: 'Badge · sticker', status: 'Element', meta: 'visible' },
      { label: 'Drop shadow', status: 'Effect', meta: 'on' },
    ],
  },
  {
    key: 'text',
    label: 'Text',
    rows: [
      { label: 'Display · 44 px', status: 'Inter', meta: 'tracking −2%' },
      { label: 'Body · 14 px', status: 'Inter', meta: 'leading 1.6' },
      { label: 'Caption · 11 px', status: 'Mono', meta: 'uppercase' },
    ],
  },
  {
    key: 'elements',
    label: 'Elements',
    rows: [
      { label: 'Badge · sticker', status: 'Element', meta: 'linked' },
      { label: 'Arrow · 12 px', status: 'Icon', meta: 'stroke 2' },
      { label: 'Frame · 4:5', status: 'Group', meta: 'auto layout' },
    ],
  },
  {
    key: 'layers',
    label: 'Layers',
    rows: [
      { label: 'Cutout · subject', status: 'Mask', meta: 'top' },
      { label: 'Backdrop · solid', status: 'Fill', meta: 'middle' },
      { label: 'Shadow · soft', status: 'Effect', meta: 'below' },
    ],
  },
];

/** Bars that fill to their value the first time the card is in view. */
function MetricBar({ width, delay }: { width: number; delay: number }) {
  return (
    <div className="fh-metric-bar">
      <motion.i
        initial={{ width: 0 }}
        whileInView={{ width: `${width}%` }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/** The card's switch is a real switch: it reports its state and moves the pill. */
function UrlToggle() {
  const [on, setOn] = useState(true);

  return (
    <div className="fh-url-toggle">
      <span>{on ? 'Open in browser' : 'Runs in this tab'}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Open the studio in this browser"
        className="fh-toggle-switch"
        onClick={() => setOn((value) => !value)}
      >
        <i className={`fh-toggle-pill${on ? ' is-on' : ''}`} />
      </button>
    </div>
  );
}

/**
 * The bento's little app panel. The tabs are real buttons that swap the row
 * set, and the rows are buttons too: picking one pins it, so the automatic
 * cycle stops the moment a visitor touches the panel.
 */
function MiniDb({
  tabs,
  label,
  autoplay = false,
}: {
  tabs: MiniTab[];
  label: string;
  autoplay?: boolean;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState(0);
  const [picked, setPicked] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (reduce || pinned || !autoplay) return;
    const timer = window.setInterval(
      () => setPicked((index) => (index + 1) % tabs[0].rows.length),
      2600,
    );
    return () => window.clearInterval(timer);
  }, [reduce, pinned, autoplay, tabs]);

  const active = tabs[tab];
  const isModelPane = autoplay && tab === 0;

  return (
    <div className="fh-mini-db">
      <div className="fh-mini-db-tabs" role="group" aria-label={`${label} panes`}>
        {tabs.map((entry, index) => (
          <button
            key={entry.key}
            type="button"
            aria-pressed={index === tab}
            onClick={() => {
              setTab(index);
              setPicked(0);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="fh-mini-db-list" role="group" aria-label={`${active.label} rows`}>
        {active.rows.map((row, index) => (
          <button
            type="button"
            className={`fh-mini-db-row${index === picked ? ' is-active' : ''}`}
            key={`${active.key}-${row.label}`}
            aria-pressed={index === picked}
            onClick={() => {
              setPicked(index);
              setPinned(true);
            }}
          >
            <i className="fh-db-dot" />
            <span>{row.label}</span>
            <span>
              {isModelPane ? (index === picked ? 'Loaded' : 'Ready') : row.status}
            </span>
            <span>{row.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BentoCard({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <Reveal className={`fh-bento-card ${className}`}>{children}</Reveal>;
}

function CardFoot({ label, href }: { label: string; href?: string }) {
  return (
    <div className="fh-bento-foot">
      {href ? (
        <Link href={href} className="fh-bento-link">
          {label}
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      ) : (
        <span className="fh-bento-link">{label}</span>
      )}
    </div>
  );
}

/** Framer's "not just vibes, a full platform" bento, rebuilt from real Pixelify features. */
export function PlatformBento() {
  return (
    <section className="fh-section fh-platform" id="platform">
      <div className="fh-container">
        <Reveal className="fh-section-header">
          <div className="fh-section-header-copy">
            <h2 className="fh-h2">Not just filters, a full studio</h2>
            <p className="fh-section-lede">
              Everything you need from a photo editor — upscaling, cutout,
              backdrops, formats and privacy — built into one browser tab.
            </p>
          </div>
          <Link href="/products/" className="fh-pill fh-pill-secondary fh-section-action">
            All features
          </Link>
        </Reveal>

        <div className="fh-bento">
          {/* Performance / upscale */}
          <BentoCard className="fh-bento-span-5 fh-bento-card--lg">
            <div className="fh-bento-demo">
              <div className="fh-metrics">
                <div className="fh-metrics-head">
                  <span>Upscale speed</span>
                  <span className="fh-badge-good">WebGPU</span>
                </div>
                <div className="fh-metric-row">
                  <div className="fh-metric-label">
                    <span>4× · Vitality</span>
                    <b>1.9 MB model</b>
                  </div>
                  <MetricBar width={94} delay={0.05} />
                </div>
                <div className="fh-metric-row">
                  <div className="fh-metric-label">
                    <span>8× · tiled</span>
                    <b>In memory</b>
                  </div>
                  <MetricBar width={78} delay={0.18} />
                </div>
                <div className="fh-metric-row">
                  <div className="fh-metric-label">
                    <span>2× · instant</span>
                    <b>1 pass</b>
                  </div>
                  <MetricBar width={56} delay={0.31} />
                </div>
              </div>
            </div>
            <div>
              <h3 className="fh-bento-title">Fast by default</h3>
              <p className="fh-bento-copy">
                Hardware acceleration when the browser has it, a WASM fallback when
                it doesn&apos;t.
              </p>
            </div>
            <CardFoot label="Upscale" href="/upscaler/" />
          </BentoCard>

          {/* Models */}
          <BentoCard className="fh-bento-span-7 fh-bento-card--lg">
            <div className="fh-bento-demo">
              <MiniDb tabs={MODEL_TABS} label="Models" autoplay />
            </div>
            <div>
              <h3 className="fh-bento-title">Every model in one place</h3>
              <p className="fh-bento-copy">
                Three upscalers and two cutout models, downloadable once and cached
                for the next run.
              </p>
            </div>
            <CardFoot label="Models" href="/products/" />
          </BentoCard>

          {/* Cutout */}
          <BentoCard className="fh-bento-span-5">
            <div className="fh-bento-demo">
              <div className="fh-cutout-demo">
                <img
                  src="/home/studio/live-cut-subject.webp"
                  alt="A pair of headphones cut out by Pixelify"
                  loading="lazy"
                />
              </div>
              <div className="fh-cutout-chips">
                <span className="fh-chip-sm is-green">Chopper</span>
                <span className="fh-chip-sm">Alpha matte</span>
                <span className="fh-chip-sm">PNG</span>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <h3 className="fh-bento-title">The subject stays</h3>
              <p className="fh-bento-copy">
                A segmentation pass for the subject, then brushes for the edges you
                want to keep.
              </p>
            </div>
            <CardFoot label="Cutout" href="/bg_remove/" />
          </BentoCard>

          {/* Privacy */}
          <BentoCard className="fh-bento-span-3">
            <div className="fh-bento-demo">
              <div className="fh-privacy-stat">
                <Lock size={20} strokeWidth={1.6} aria-hidden="true" />
                0 B
              </div>
              <p className="fh-privacy-sub">
                uploaded. Every file stays in this browser tab.
              </p>
              <div className="fh-privacy-list">
                <span className="fh-privacy-row">
                  <Check size={12} aria-hidden="true" />
                  Files stay on device
                </span>
                <span className="fh-privacy-row">
                  <Check size={12} aria-hidden="true" />
                  No account required
                </span>
                <span className="fh-privacy-row">
                  <Check size={12} aria-hidden="true" />
                  No tracking pixels
                </span>
              </div>
            </div>
            <CardFoot label="Privacy" href="/privacy/" />
          </BentoCard>

          {/* Spotlight */}
          <BentoCard className="fh-bento-span-4 fh-bento-card--spotlight">
            <div className="fh-spotlight-content">
              <div>
                <div className="fh-spotlight-stat">8×</div>
                <p className="fh-spotlight-label" style={{ marginTop: 12 }}>
                  resolution, rendered
                  <br />
                  on your own machine.
                </p>
              </div>
              <div className="fh-bento-foot">
                <Link href="/upscaler/" className="fh-bento-link">
                  Resolution
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </BentoCard>

          {/* Formats */}
          <BentoCard className="fh-bento-span-3">
            <div className="fh-bento-demo">
              <div className="fh-format-rows">
                <span className="fh-format-row">
                  <span>
                    PNG <small>· transparent</small>
                  </span>
                  <span>Lossless</span>
                </span>
                <span className="fh-format-row">
                  <span>
                    WebP <small>· small</small>
                  </span>
                  <span>Lossy</span>
                </span>
                <span className="fh-format-row">
                  <span>
                    JPG <small>· universal</small>
                  </span>
                  <span>High</span>
                </span>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <h3 className="fh-bento-title">Export how you need it</h3>
            </div>
            <CardFoot label="Formats" href="/docs/" />
          </BentoCard>

          {/* Security / no signup */}
          <BentoCard className="fh-bento-span-3">
            <div className="fh-bento-demo">
              <div className="fh-urlbar">
                <span className="fh-url-lock">
                  <ShieldCheck size={10} aria-hidden="true" />
                </span>
                <span>pixelify.me/upscaler</span>
              </div>
              <UrlToggle />
            </div>
            <div style={{ marginTop: 16 }}>
              <h3 className="fh-bento-title">Nothing to sign up for</h3>
            </div>
            <CardFoot label="No account" href="/upscaler/" />
          </BentoCard>

          {/* Speed chart */}
          <BentoCard className="fh-bento-span-6">
            <div className="fh-bento-demo">
              <svg
                className="fh-chart"
                viewBox="0 0 600 160"
                preserveAspectRatio="none"
                role="img"
                aria-label="Chart comparing WebGPU and WASM render time"
              >
                <defs>
                  <linearGradient id="fhChartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0099ff" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#0099ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M0 126 C40 118 60 96 96 100 C134 104 150 72 190 80 C232 89 246 50 286 58 C326 66 344 42 384 48 C428 54 444 30 486 36 C526 42 556 24 600 20 L600 160 L0 160 Z"
                  fill="url(#fhChartFill)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.1, delay: 0.35, ease: 'easeOut' }}
                />
                <motion.path
                  d="M0 126 C40 118 60 96 96 100 C134 104 150 72 190 80 C232 89 246 50 286 58 C326 66 344 42 384 48 C428 54 444 30 486 36 C526 42 556 24 600 20"
                  fill="none"
                  stroke="#0099ff"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d="M0 146 C44 140 66 132 104 136 C146 140 166 120 206 124 C246 128 270 108 306 114 C346 121 366 100 406 106 C446 112 470 94 510 100 C550 106 572 92 600 90"
                  fill="none"
                  stroke="#5f6b78"
                  strokeWidth="1.5"
                  strokeDasharray="4 5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="fh-chart-legend">
                <span>
                  <i className="is-blue" /> WebGPU · ~9s
                </span>
                <span>
                  <i /> WASM · ~18s
                </span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <h3 className="fh-bento-title">Fast on any browser</h3>
              <p className="fh-bento-copy">
                The runtime picks the best backend it can find, then reports the pass
                time right in the panel.
              </p>
            </div>
            <CardFoot label="Speed" href="/docs/" />
          </BentoCard>

          {/* Before / after */}
          <BentoCard className="fh-bento-span-6">
            <div className="fh-bento-demo">
              <ImageCompare
                before="/home/studio/live-compare-before.jpg"
                after="/home/studio/live-compare-after.jpg"
                alt="A car photograph upscaled 4× with Pixelify"
                beforeLabel="Original"
                afterLabel="4× · Pixel-Dance"
                aspect="16 / 6"
                start={56}
              />
            </div>
            <div style={{ marginTop: 18 }}>
              <h3 className="fh-bento-title">Before / after, live</h3>
              <p className="fh-bento-copy">
                Drag the slider on any result and inspect the pixels at 100%, 200%
                or 400%.
              </p>
            </div>
            <CardFoot label="Compare" href="/upscaler/" />
          </BentoCard>

          {/* Design layers */}
          <BentoCard className="fh-bento-span-6">
            <div className="fh-bento-demo">
              <MiniDb tabs={DESIGN_TABS} label="Design layers" />
            </div>
            <div style={{ marginTop: 18 }}>
              <h3 className="fh-bento-title">Finish it on the canvas</h3>
              <p className="fh-bento-copy">
                Backdrops, shadows, crops, text and vector layers — all export with
                the image.
              </p>
            </div>
            <CardFoot label="Design" href="/bg_remove/" />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
