import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Infinity as InfinityIcon,
  WifiOff,
  Sliders,
  CheckCircle2,
  XCircle,
  Cpu,
  Lock,
  ArrowUpRight,
  BrainCircuit,
  CircleCheckBig,
  CloudOff,
} from 'lucide-react';

type FeatureCardProps = {
  icon: React.ElementType;
  tag: string;
  badge?: string;
  title: string;
  description: string;
  highlight?: boolean;
  tone?: 'mint' | 'blue' | 'violet' | 'amber' | 'rose';
  className?: string;
  visual?: React.ReactNode;
  index: number;
};

const toneClasses = {
  mint: 'pixelify-feature-card--mint',
  blue: 'pixelify-feature-card--blue',
  violet: 'pixelify-feature-card--violet',
  amber: 'pixelify-feature-card--amber',
  rose: 'pixelify-feature-card--rose',
};

function FeatureCard({
  icon: Icon,
  tag,
  badge,
  title,
  description,
  highlight = false,
  tone = 'mint',
  className = '',
  visual,
  index,
}: FeatureCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.065, 0.32), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.22 } }}
      className={`pixelify-feature-card group ${highlight ? 'pixelify-feature-card--security' : toneClasses[tone]} ${className}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <span className="pixelify-feature-icon"><Icon size={22} strokeWidth={2} /></span>
          <div className="flex max-w-[72%] flex-wrap items-center justify-end gap-1.5">
            <span className="pixelify-feature-tag">{tag}</span>
            {badge && <span className="pixelify-feature-badge">{badge}</span>}
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-2">
          <h3 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h3>
          <p className="text-sm leading-6">{description}</p>
        </div>
      </div>

      {visual && <div className="pixelify-feature-visual">{visual}</div>}
      <ArrowUpRight className="pixelify-feature-arrow" size={17} aria-hidden="true" />
    </motion.article>
  );
}

export default function WhyChoosePixelify() {
  return (
    <section
      className="pixelify-why-section w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2 overflow-hidden"
      aria-labelledby="why-pixelify-title"
    >
      <div className="pixelify-why-shell relative isolate w-full overflow-hidden rounded-[28px] sm:rounded-[44px] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="pixelify-why-glow pixelify-why-glow-one" aria-hidden="true" />
        <div className="pixelify-why-glow pixelify-why-glow-two" aria-hidden="true" />

        <div className="pixelify-why-content relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-7 sm:py-18 lg:px-10 lg:py-24">
          <motion.header
            className="mx-auto mb-10 max-w-3xl text-center sm:mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="pixelify-eyebrow">
              THE PIXELIFY DIFFERENCE
            </span>
            <h2 id="why-pixelify-title" className="mt-5 text-balance text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Why creators &amp; engineers choose{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-[#00FF85] to-emerald-500 bg-clip-text text-transparent">Pixelify</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-300/75 sm:text-base">
              Enterprise-grade neural networks running completely inside your browser. No cloud queues, no credit tokens, and zero privacy compromises.
            </p>
          </motion.header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            <FeatureCard
              index={0}
              icon={ShieldCheck}
              tag="Zero Cloud Uploads"
              badge="100% Private"
              title="Your images stay yours."
              description="Pixelify processes your images directly in your browser. Your files stay on your device instead of being uploaded to a processing server."
              highlight
              className="sm:col-span-2 lg:col-span-2"
              visual={
                <div className="flex flex-col items-start justify-between gap-3 text-xs font-mono sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2 text-neutral-400">
                    <Lock size={14} className="text-[#00FF85]" />
                    <span>Client-Side Sandboxing:</span>
                    <span className="font-semibold text-white">Active</span>
                  </div>
                  <div className="flex max-w-full items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-3 py-2 text-[#00FF85]">
                    <CloudOff size={14} className="text-[#00FF85]" /><span>Processed On-Device</span>
                  </div>
                </div>
              }
            />

            <FeatureCard
              index={1}
              icon={Zap}
              tag="WebGPU + WASM"
              badge="Near-Native"
              title="Raw Hardware Acceleration"
              description="Direct GPU shaders via ONNX Runtime Web eliminate slow server roundtrips for instant real-time processing."
              tone="mint"
              visual={<div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 font-semibold"><Cpu size={15} /> Hardware Engine:</span><span className="rounded-full border border-emerald-300/70 bg-emerald-100/80 px-3 py-1 font-bold text-emerald-800">GPU Core Parallelism</span></div>}
            />

            <FeatureCard
              index={2}
              icon={BrainCircuit}
              tag="Chopper & Vitality"
              badge="8K Resolution"
              title="State-of-the-Art Neural Models"
              description="Trained on millions of high-res images to preserve flyaway hair strands, transparent glass, and micro-textures without plastic artifacts."
              tone="violet"
            />

            <FeatureCard
              index={3}
              icon={InfinityIcon}
              tag="No Paywalls"
              badge="Zero Watermarks"
              title="Unlimited Generations"
              description="No $40/month subscriptions, no credit tokens, and no forced downscaling. Generate as many cutouts and upscales as you need."
              tone="amber"
            />

            <FeatureCard
              index={4}
              icon={WifiOff}
              tag="Persistent Cache"
              badge="Works Offline"
              title="Anywhere, Even Airplane Mode"
              description="Model weights cache automatically in your browser. Once loaded once, upscale and edit seamlessly without an active internet connection."
              tone="blue"
            />

            <FeatureCard
              index={5}
              icon={Sliders}
              tag="Pro Canvas Studio"
              badge="Batch Ready"
              title="Interactive Creative Studio"
              description="Split-screen compare sliders, transparent alpha matting, custom backdrop replacement, and lossless PNG/WebP exports built for designers."
              tone="rose"
              className="sm:col-span-2 lg:col-span-3"
              visual={
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  {['Sub-pixel masking', '2x, 4x, 8x scaling', 'Transparent PNG / WebP', 'Batch drag & drop'].map((item) => (
                    <div key={item} className="flex items-center gap-2 font-medium">
                      <CircleCheckBig size={15} className="shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              }
            />
          </div>

          <div className="pixelify-comparison mt-7 rounded-2xl p-5 sm:mt-9 sm:rounded-3xl sm:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <div className="flex flex-col gap-3.5">
                <span className="text-md font-bold uppercase tracking-wider text-rose-400">Traditional Cloud AI Tools</span>
                <ul className="flex flex-col gap-3 text-sm text-neutral-300">
                  <li className="flex items-start gap-2.5"><XCircle size={16} className="mt-0.5 shrink-0 text-rose-500" /><span>Images uploaded to third-party servers and cloud logs</span></li>
                  <li className="flex items-start gap-2.5"><XCircle size={16} className="mt-0.5 shrink-0 text-rose-500" /><span>$20 to $60/month subscriptions or restrictive token credit meters</span></li>
                  <li className="flex items-start gap-2.5"><XCircle size={16} className="mt-0.5 shrink-0 text-rose-500" /><span>Compressed outputs with forced watermarks on free tiers</span></li>
                </ul>
              </div>
              <div className="flex flex-col gap-3.5 border-t border-neutral-200 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <span className="text-md font-bold uppercase tracking-wider text-emerald-400">Pixelify Local In-Browser AI</span>
                <ul className="flex flex-col gap-3 text-sm font-medium text-neutral-300">
                  <li className="flex items-start gap-2.5"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /><span>100% private, photos stay strictly in your browser RAM</span></li>
                  <li className="flex items-start gap-2.5"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /><span>Completely free with unlimited processing &amp; zero waitlists</span></li>
                  <li className="flex items-start gap-2.5"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /><span>Full-fidelity uncompressed PNG, WebP, and JPG downloads</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-center text-xs text-white/55 sm:mt-10 sm:text-sm">
            <span className="inline-flex items-center gap-2"><Lock size={14} className="text-[#00FF85]" /> Local-first workflow</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
            <span>Built for quick, everyday image tasks</span>
          </div>
        </div>
      </div>
    </section>
  );
}