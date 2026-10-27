'use client';

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  FileImage,
  ImagePlus,
  LockKeyhole,
  Monitor,
  Pause,
  Play,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";

type Flow = "upscale" | "background" | "anime" | "product";
type FlowConfig = {
  id: Flow;
  name: string;
  description: string;
  accent: string;
  icon: React.ElementType;
  file: string;
  dimensions: string;
  size: string;
};

const FLOWS: FlowConfig[] = [
  {
    id: "upscale",
    name: "Photo upscaler",
    description: "Enhance photo detail",
    accent: "#7ce7b2",
    icon: Wand2,
    file: "summer-campaign.jpg",
    dimensions: "1280 × 960 px",
    size: "2.4 MB · JPG",
  },
  {
    id: "background",
    name: "Background remover",
    description: "Create a clean cutout",
    accent: "#8bd7e8",
    icon: ScanLine,
    file: "portrait-photo.jpg",
    dimensions: "1600 × 1200 px",
    size: "1.8 MB · JPG",
  },
  {
    id: "anime",
    name: "Anime upscaler",
    description: "Keep linework crisp",
    accent: "#c5b4ff",
    icon: ImagePlus,
    file: "anime-frame.jpg",
    dimensions: "720 × 480 px",
    size: "940 KB · JPG",
  },
  {
    id: "product",
    name: "Product cutout",
    description: "Refine product edges",
    accent: "#f1c78e",
    icon: ScanLine,
    file: "product-shot.jpg",
    dimensions: "1400 × 1400 px",
    size: "2.1 MB · JPG",
  },
];

const STEPS = ["Upload", "Configure", "Process", "Review"];
const COPY: Record<Flow, string[]> = {
  upscale: [
    "Start with a photo you’d like to sharpen or enlarge.",
    "Choose how much you want to enlarge the image.",
    "The demo is simulating an on-device enhancement workflow.",
    "Review the preview state, then open the real tool to process your image.",
  ],
  background: [
    "Choose a portrait or image with a clear foreground subject.",
    "Preview the cutout workflow and edge refinement options.",
    "The demo is simulating foreground detection and mask refinement.",
    "Review the preview state, then open the real tool to process your image.",
  ],
  anime: [
    "Start with an illustration or a compressed anime frame.",
    "Choose an enlargement factor for the illustration.",
    "The demo is simulating line and color detail enhancement.",
    "Review the preview state, then open the real tool to process your image.",
  ],
  product: [
    "Start with a product image for a clean storefront cutout.",
    "Preview edge refinement options for the product silhouette.",
    "The demo is simulating object detection and edge cleanup.",
    "Review the preview state, then open the real tool to process your image.",
  ],
};

const isUpscaler = (flow: Flow) => flow === "upscale" || flow === "anime";

export default function HomeWorkflowDemos({
  onLaunchUpscaler,
  onLaunchBGRemove,
}: {
  onLaunchUpscaler: () => void;
  onLaunchBGRemove: () => void;
}) {
  const [flow, setFlow] = useState<Flow>("upscale");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState("2×");
  const [feather, setFeather] = useState(true);
  const reducedMotion = useReducedMotion();
  const config = FLOWS.find((item) => item.id === flow)!;
  const Icon = config.icon;

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = window.setTimeout(() => {
      if (step < STEPS.length - 1) {
        setStep(step + 1);
        return;
      }

      const currentFlowIndex = FLOWS.findIndex((item) => item.id === flow);
      const nextFlow = FLOWS[(currentFlowIndex + 1) % FLOWS.length].id;
      setFlow(nextFlow);
      setStep(0);
    }, step === 2 ? 3200 : step === STEPS.length - 1 ? 6000 : 4000);
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion, step, flow]);

  const selectFlow = (next: Flow) => {
    setFlow(next);
    setStep(0);
    setPlaying(true);
  };

  const goToStep = (next: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  };

  const advanceToNextFlow = () => {
    const currentFlowIndex = FLOWS.findIndex((item) => item.id === flow);
    setFlow(FLOWS[(currentFlowIndex + 1) % FLOWS.length].id);
    setStep(0);
  };

  const handlePlayback = () => {
    if (reducedMotion) {
      if (step < STEPS.length - 1) goToStep(step + 1);
      else advanceToNextFlow();
      return;
    }
    setPlaying((value) => !value);
  };

  const openTool = () => {
    if (isUpscaler(flow)) onLaunchUpscaler();
    else onLaunchBGRemove();
  };

  const title =
    step === 0
      ? "Add an image to get started"
      : step === 1
        ? `Configure ${config.name.toLowerCase()}`
        : step === 2
          ? flow === "background" || flow === "product"
            ? "Refining the subject edges"
            : "Enhancing image details"
          : "Your preview is ready";

  return (
    <section id="home-workflow-demo" className="w-full" aria-label="Pixelify workflow demo">
      <div
        className="mx-auto w-full overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0b0e0d] text-white shadow-[0_32px_100px_-45px_rgba(0,0,0,0.9)]"
        style={{ ["--demo-accent" as string]: config.accent }}
      >
        {/* Console chrome */}
        <header className="flex min-h-[58px] items-center justify-between gap-4 border-b border-white/[0.07] bg-[#101412] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b64]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f4c45e]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#69d99a]/80" />
            </div>
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="truncate text-[11px] font-semibold tracking-[0.17em] text-white/75">
              PIXELIFY <span className="font-normal text-white/35">/ WORKSPACE</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-emerald-200/90 sm:text-[11px]">
            <ShieldCheck size={13} />
            <span>PRIVACY FIRST</span>
          </div>
        </header>

        {/* Single workflow selector: intentionally not repeated in a sidebar */}
        <div className="border-b border-white/[0.07] px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Interactive preview</p>
              <p className="mt-1 text-sm text-white/65">Explore the workflow before opening a tool.</p>
            </div>
            <span className="hidden items-center gap-1.5 text-[11px] text-white/35 md:flex">
              <Monitor size={13} /> Desktop experience
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {FLOWS.map((item) => {
              const ItemIcon = item.icon;
              const active = item.id === flow;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectFlow(item.id)}
                  aria-pressed={active}
                  className={`group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-4 ${
                    active
                      ? "border-white/20 bg-white/[0.075]"
                      : "border-white/[0.055] bg-white/[0.018] hover:border-white/15 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/20"
                    style={{ color: item.accent }}
                  >
                    <ItemIcon size={17} strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-xs font-semibold sm:text-[13px] ${active ? "text-white" : "text-white/75"}`}>
                      {item.name}
                    </span>
                    <span className="mt-1 hidden truncate text-[11px] text-white/35 sm:block">{item.description}</span>
                  </span>
                  {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--demo-accent)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress and explanation */}
        <div className="grid gap-5 border-b border-white/[0.07] px-4 py-5 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-8 lg:py-6">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/35">Workflow</span>
              <button
                type="button"
                onClick={handlePlayback}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-white/60 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label={reducedMotion ? step === STEPS.length - 1 ? "Go to next workflow" : "Go to next step" : playing ? "Pause automatic demo" : "Play automatic demo"}
              >
                {reducedMotion ? <ChevronRight size={12} /> : playing ? <Pause size={12} /> : <Play size={12} />}
                {reducedMotion ? step === STEPS.length - 1 ? "Next workflow" : "Next step" : playing ? "Pause demo" : "Play demo"}
              </button>
            </div>
            <div className="relative grid grid-cols-4 gap-2">
              <div className="absolute left-3 right-3 top-[13px] h-px bg-white/10" />
              {STEPS.map((label, index) => {
                const active = step === index;
                const complete = step > index;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => goToStep(index)}
                    aria-current={active ? "step" : undefined}
                    className="group relative flex min-w-0 flex-col items-start gap-2 text-left focus-visible:outline-none"
                  >
                    <span
                      className={`z-[1] flex h-[27px] w-[27px] items-center justify-center rounded-full border text-[10px] transition ${
                        complete
                          ? "border-emerald-200/60 bg-emerald-200 text-[#092016]"
                          : active
                            ? "border-[var(--demo-accent)] bg-[var(--demo-accent)] text-[#09120d]"
                            : "border-white/15 bg-[#101412] text-white/40 group-hover:border-white/30"
                      }`}
                    >
                      {complete ? <Check size={12} /> : `0${index + 1}`}
                    </span>
                    <span className={`truncate text-[10px] sm:text-[11px] ${active ? "font-semibold text-white" : "text-white/40"}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${flow}-${step}-description`}
              initial={reducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 sm:px-5"
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: config.accent }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.accent }} />
                Step 0{step + 1} <span className="text-white/20">/</span> {STEPS[step]}
              </div>
              <p className="text-sm leading-6 text-white/70">{COPY[flow][step]}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Main app preview */}
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_290px]">
          <main className="min-w-0 p-4 sm:p-6 lg:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
                  Workspace <ChevronRight size={11} /> <span className="truncate">{config.name}</span>
                </div>
                <h3 className="text-lg font-medium tracking-[-0.035em] text-white sm:text-xl">{title}</h3>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.025] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <span className={`h-1.5 w-1.5 rounded-full ${step === 2 ? "animate-pulse bg-amber-300" : "bg-emerald-300"}`} />
                {step === 2 ? "Processing" : step === 3 ? "Preview ready" : "Demo mode"}
              </span>
            </div>

            <div className="relative min-h-[290px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1411] sm:min-h-[350px]">
              <div className="pointer-events-none absolute inset-0 opacity-[0.22]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0b0e0d]/80 px-2.5 py-2 text-[10px] text-white/55 backdrop-blur">
                <FileImage size={13} /> {config.file}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${flow}-${step}-stage`}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.99, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, scale: 0.995, y: -3 }}
                  transition={{ duration: 0.24 }}
                  className="relative flex min-h-[290px] items-center justify-center p-5 pt-16 sm:min-h-[350px] sm:p-8"
                >
                  {step === 0 && (
                    <div className="flex max-w-xs flex-col items-center text-center">
                      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/65">
                        <ImagePlus size={23} strokeWidth={1.5} />
                      </span>
                      <p className="text-sm font-medium text-white/85">A simple, guided workflow</p>
                      <p className="mt-2 text-xs leading-5 text-white/40">This is a product preview. Open the tool to process your own image.</p>
                      <button type="button" onClick={() => goToStep(1)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-[#101411] transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                        Explore settings <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid w-full max-w-[500px] items-center gap-5 sm:grid-cols-[1fr_1fr]">
                      <Artwork flow={flow} accent={config.accent} />
                      <div className="min-w-0">
                        <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em]" style={{ color: config.accent }}>
                          <Check size={12} /> Sample image loaded
                        </span>
                        <p className="break-words text-sm font-medium text-white/85">{config.file}</p>
                        <p className="mt-1 text-xs text-white/40">{config.dimensions} · {config.size}</p>
                        {isUpscaler(flow) ? (
                          <div className="mt-5">
                            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">Enlargement</label>
                            <div className="grid grid-cols-3 gap-2">
                              {["2×", "4×", "8×"].map((value) => (
                                <button key={value} type="button" onClick={() => setScale(value)} aria-pressed={scale === value} className={`rounded-lg border py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${scale === value ? "border-white/25 bg-white/[0.09] text-white" : "border-white/[0.08] bg-black/10 text-white/45 hover:text-white/75"}`}>
                                  {value}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setFeather((value) => !value)} aria-pressed={feather} className="mt-5 flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-black/10 px-3 py-2.5 text-xs text-white/60 hover:text-white/85">
                            <span className="flex items-center gap-2"><SlidersHorizontal size={13} /> Feather edges</span>
                            <span className={`h-4 w-7 rounded-full p-0.5 transition ${feather ? "bg-emerald-300/80" : "bg-white/20"}`}><span className={`block h-3 w-3 rounded-full bg-[#0b0e0d] transition-transform ${feather ? "translate-x-3" : ""}`} /></span>
                          </button>
                        )}
                        <button type="button" onClick={() => goToStep(2)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-[#0b1510] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" style={{ backgroundColor: config.accent }}>
                          Preview workflow <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="flex w-full max-w-sm flex-col items-center text-center">
                      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]" style={{ color: config.accent }}>
                        <Icon size={25} strokeWidth={1.5} />
                        <motion.span className="absolute -inset-1 rounded-[19px] border" style={{ borderColor: `${config.accent}66` }} animate={reducedMotion ? undefined : { opacity: [0.2, 0.8, 0.2], scale: [0.98, 1.04, 0.98] }} transition={{ duration: 2, repeat: Infinity }} />
                      </div>
                      <p className="text-sm font-medium text-white/85">{flow === "background" || flow === "product" ? "Refining subject boundaries" : "Enhancing image detail"}</p>
                      <p className="mt-2 text-xs leading-5 text-white/40">Illustrative processing state — no image is being processed in this demo.</p>
                      <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: config.accent }} initial={{ width: "6%" }} animate={{ width: "88%" }} transition={{ duration: 3.1, ease: "easeInOut" }} />
                      </div>
                      <div className="mt-2 flex w-full justify-between text-[10px] text-white/30"><span>Preparing preview</span><span>Simulated</span></div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="grid w-full max-w-[500px] items-center gap-5 sm:grid-cols-[1fr_1fr]">
                      <Artwork flow={flow} accent={config.accent} />
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-emerald-200"><CircleCheck size={13} /> Preview state</span>
                        <p className="mt-2 text-sm font-medium text-white/85">{isUpscaler(flow) ? `Enhanced preview · ${scale}` : "Background cutout preview"}</p>
                        <p className="mt-2 text-xs leading-5 text-white/40">This is a visual walkthrough, not an exported result. Open the real tool to work with your image.</p>
                        <button type="button" onClick={openTool} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-[#0b1510] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" style={{ backgroundColor: config.accent }}>
                          Open {isUpscaler(flow) ? "AI upscaler" : "background remover"} <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3 text-[10px] text-white/30">
                <span className="flex items-center gap-1.5"><LockKeyhole size={11} /> Demo only · no upload required</span>
                <span>{String(step + 1).padStart(2, "0")} / 04</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-white/35">Use the steps above to explore the interface.</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => goToStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/55 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-25">Back</button>
                {step < 3 ? (
                  <button type="button" onClick={() => goToStep(step + 1)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-white/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                    Next step <ArrowRight size={12} />
                  </button>
                ) : (
                  <button type="button" onClick={openTool} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-white/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                    Launch tool <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </main>

          {/* Context panel replaces the duplicated tool picker */}
          <aside className="border-t border-white/[0.07] bg-[#0e1210] p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/35">
              <SlidersHorizontal size={13} /> Session details
            </div>
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/20" style={{ color: config.accent }}>
                  <FileImage size={16} />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-xs font-semibold text-white/80">{config.file}</p>
                  <p className="mt-1 text-[10px] text-white/35">{config.size}</p>
                </div>
              </div>
              <div className="my-4 h-px bg-white/[0.07]" />
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3"><dt className="text-white/35">Dimensions</dt><dd className="text-right text-white/65">{config.dimensions}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-white/35">Workflow</dt><dd className="text-right text-white/65">{config.name}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-white/35">Mode</dt><dd className="text-right text-white/65">Interactive demo</dd></div>
              </dl>
            </div>
            <div className="mt-3 rounded-xl border border-emerald-200/10 bg-emerald-200/[0.035] p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-100/85"><ShieldCheck size={14} /> Privacy by design</div>
              <p className="mt-2 text-[11px] leading-5 text-white/40">This walkthrough uses sample UI states only. Your real image is handled by the selected tool’s processing flow.</p>
            </div>
            <button type="button" onClick={openTool} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#0b100d] transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              Open {isUpscaler(flow) ? "AI upscaler" : "background remover"} <ArrowRight size={14} />
            </button>
            <p className="mt-3 text-center text-[10px] leading-4 text-white/25">No account or file upload needed to explore this demo.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Artwork({ flow, accent }: { flow: Flow; accent: string }) {
  const isCutout = flow === "background" || flow === "product";
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-[#151b17]">
      <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 65% 25%, ${accent}33, transparent 42%), linear-gradient(145deg, #1b2720, #101411 68%)` }} />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/50 to-transparent" />
      {isCutout ? (
        <>
          <div className="absolute bottom-[14%] left-[30%] h-[42%] w-[40%] rounded-t-[48%] rounded-b-[18%] border border-white/10" style={{ background: `linear-gradient(145deg, ${accent}aa, #354139)` }} />
          <div className="absolute bottom-[49%] left-[40%] h-[20%] w-[20%] rounded-full border border-white/10" style={{ background: `linear-gradient(135deg, ${accent}, #6b7770)` }} />
          <div className="absolute bottom-[17%] left-[24%] h-[2px] w-[52%] rounded-full" style={{ backgroundColor: `${accent}77` }} />
        </>
      ) : (
        <>
          <div className="absolute left-[14%] top-[15%] h-[58%] w-[72%] rotate-[-7deg] rounded-lg border border-white/10 bg-black/20 p-1.5">
            <div className="relative h-full w-full overflow-hidden rounded-md" style={{ background: `linear-gradient(145deg, ${accent}88, #354139 55%, #111713)` }}>
              <div className="absolute -right-[10%] top-[8%] h-[70%] w-[55%] rounded-full border border-white/15 bg-white/10 blur-[1px]" />
              <div className="absolute bottom-[-10%] left-[8%] h-[55%] w-[80%] rounded-t-[50%] bg-black/25" />
              <div className="absolute left-[18%] top-[12%] h-[45%] w-[28%] rounded-full border border-white/15 bg-white/10" />
            </div>
          </div>
          <div className="absolute bottom-[14%] left-[10%] rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[8px] tracking-wide text-white/55 backdrop-blur">DETAIL PREVIEW</div>
        </>
      )}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
    </div>
  );
}
