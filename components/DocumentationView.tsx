'use client';

import Footer from '@/components/Footer';
import { useApp } from '@/components/AppProvider';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Cpu,
  Image as ImageIcon,
  LifeBuoy,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

const guides = [
  {
    id: 'getting-started',
    number: '01',
    icon: Sparkles,
    label: 'START HERE',
    title: 'Your first edit',
    description: 'Choose a tool, add an image, and let Pixelify work in your browser.',
    points: ['Open the upscaler or background remover.', 'Select an image from your device.', 'Adjust the result, then export it.'],
    href: '/products',
    action: 'Explore the tools',
    accent: 'from-lime-300/20 via-emerald-300/5',
  },
  {
    id: 'upscaler',
    number: '02',
    icon: ImageIcon,
    label: 'AI IMAGE UPSCALER',
    title: 'Make images larger and clearer',
    description: 'Increase image resolution while preserving detail and texture.',
    points: ['Pick an upscaling model for your image.', 'Choose a scale and preview the output.', 'Download the finished image to your device.'],
    href: '/upscaler',
    action: 'Open upscaler',
    accent: 'from-sky-300/20 via-blue-300/5',
  },
  {
    id: 'background-remover',
    number: '03',
    icon: ScanLine,
    label: 'BACKGROUND REMOVER',
    title: 'Create a clean cutout',
    description: 'Remove an image background, refine the edges, and export a transparent result.',
    points: ['Load a photo or product image.', 'Review the automatic cutout.', 'Use the editor to erase or restore areas.'],
    href: '/bg_remove',
    action: 'Open background remover',
    accent: 'from-violet-300/20 via-fuchsia-300/5',
  },
];

const topics = [
  { icon: ShieldCheck, title: 'Privacy by design', text: 'Image editing runs on your device. Learn what that means for your files.', href: '/privacy', link: 'Read the privacy policy' },
  { icon: Cpu, title: 'Browser requirements', text: 'Check the browser and hardware features that help Pixelify run smoothly.', href: '/products#requirements', link: 'View requirements' },
  { icon: LifeBuoy, title: 'Need a hand?', text: 'Tell us what happened, which tool you used, and what you expected.', href: '/contact', link: 'Contact Pixelify' },
];

export default function DocumentationView() {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen w-full bg-[#090a0c] text-white">
      <main>
        <section className="relative isolate overflow-hidden border-b border-white/[0.08]">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(164,214,65,0.12),transparent_52%)]" />
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                <BookOpen className="h-3.5 w-3.5 text-[#b9e56a]" /> Pixelify guidebook
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">
                Make more of every image.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
                Simple guides for sharper images, cleaner cutouts, and a smoother editing experience — all inside your browser.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button onClick={() => navigateTo('upscaler')} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-[#d9f6a2]">
                  Start editing <ArrowRight className="h-4 w-4" />
                </button>
                <a href="#guides" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-5 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/[0.07]">
                  Browse guides <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b9e56a]/10 text-[#b9e56a]"><ShieldCheck className="h-[18px] w-[18px]" /></span>
                <div><p className="text-sm font-medium">Private by default</p><p className="mt-0.5 text-xs text-white/45">Processed on your device</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200"><Zap className="h-[18px] w-[18px]" /></span>
                <div><p className="text-sm font-medium">No setup required</p><p className="mt-0.5 text-xs text-white/45">Open a tool and get started</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><Check className="h-[18px] w-[18px]" /></span>
                <div><p className="text-sm font-medium">You stay in control</p><p className="mt-0.5 text-xs text-white/45">Review before you export</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="guides" className="mx-auto max-w-7xl scroll-mt-10 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b9e56a]">Learn at your pace</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Guides for every workflow</h2>
            </div>
            <span className="text-sm text-white/45">A quick path from upload to finished image</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {guides.map(({ id, number, icon: Icon, label, title, description, points, href, action, accent }) => (
              <article key={id} className="group relative flex min-h-[380px] flex-col overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#111316] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[0.17] hover:bg-[#141619] sm:p-7">
                <div aria-hidden="true" className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br ${accent} to-transparent blur-2xl opacity-80`} />
                <div className="relative flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]"><Icon className="h-5 w-5 text-white/85" /></span>
                  <span className="font-mono text-xs text-white/35">{number}</span>
                </div>
                <p className="relative mt-7 text-[10px] font-bold tracking-[0.17em] text-white/45">{label}</p>
                <h3 className="relative mt-2 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="relative mt-2 text-sm leading-6 text-white/55">{description}</p>
                <ul className="relative mt-5 space-y-2.5 text-[13px] text-white/70">
                  {points.map((point) => <li key={point} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#b9e56a]" /><span>{point}</span></li>)}
                </ul>
                <a href={href} className="relative mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-white transition group-hover:text-[#d9f6a2]">
                  {action}<ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <div className="grid gap-8 rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-[#171a16] to-[#101114] p-6 sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:p-11">
            <div className="max-w-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b9e56a]/10 text-[#c8ed8d]"><BookOpen className="h-5 w-5" /></span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#b9e56a]">Good to know</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Helpful details, all in one place.</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">Find the answers that help you edit confidently and get the best from your device.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {topics.map(({ icon: Icon, title, text, href, link }) => (
                <a key={title} href={href} className="group rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-white/20 hover:bg-black/30 sm:p-5">
                  <Icon className="h-5 w-5 text-[#c8ed8d]" />
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 min-h-[60px] text-xs leading-5 text-white/50">{text}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/75 group-hover:text-white">{link}<ArrowUpRight className="h-3.5 w-3.5" /></span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer onTabChange={navigateTo} />
    </div>
  );
}
