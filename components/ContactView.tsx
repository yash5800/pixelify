"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Lightbulb,
  Bug,
  ShieldCheck,
  Code2,
  MessageSquare,
} from "lucide-react";
import { FeedbackForm } from "@/components/FeedbackSection";

const SUPPORT_ITEMS = [
  {
    icon: Lightbulb,
    title: "Feature requests & ideas",
    description:
      "Have an idea to make Pixelify better? We love hearing community suggestions.",
  },
  {
    icon: Bug,
    title: "Bug & error reporting",
    description:
      "Encountered an issue? Tell us your browser (Chrome, Edge, Safari) and what happened.",
  },
  {
    icon: ShieldCheck,
    title: "Private & secure",
    description:
      "Your message is delivered straight to the engineers. Images are never sent or stored.",
  },
];

export default function ContactView() {
  return (
    <main className="relative min-h-screen bg-[#08080B] text-white flex flex-col justify-between overflow-x-hidden selection:bg-[#00FF85]/20 selection:text-white">
      {/* Subtle ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-32 top-[-140px] h-[380px] w-[380px] rounded-full bg-violet-600/[0.05] blur-[120px]" />
        <div className="absolute -right-32 top-[10%] h-[380px] w-[380px] rounded-full bg-emerald-500/[0.04] blur-[130px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        {/* Main Content: Left Form + Right Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start flex-1 pt-2 sm:pt-4">
          {/* Left Form Column */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-7 flex flex-col"
          >
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-400 mb-3">
                <MessageSquare className="h-3 w-3 text-neutral-400" />
                <span>Support & Feedback</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold tracking-tight text-white leading-tight">
                Share your thoughts
              </h1>

              <p className="mt-2 text-sm text-neutral-400 leading-relaxed max-w-lg">
                Have an idea, found an issue, or want to say hello? Drop us a note below.
              </p>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#101014] p-5 sm:p-7 shadow-xl shadow-black/40">
              <FeedbackForm standalone />
            </div>
          </motion.section>

          {/* Right Reference Sidebar — positioned below heading to align with the form card */}
          {/* NOTE: You can adjust `lg:pt-28` higher or lower (e.g. lg:pt-20, lg:pt-24, lg:pt-32) to move this section down or up on desktop */}
          <motion.aside
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="lg:col-span-5 flex flex-col gap-3.5 lg:pt-28"
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-0.5">
              Helpful notes
            </div>

            {SUPPORT_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.035]"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-semibold text-neutral-200">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Indie note */}
            <div className="mt-2 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3.5 flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-white/[0.04] flex items-center justify-center text-neutral-400 shrink-0">
                <Code2 className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Made by independent developers. Your feedback directly shapes the next release.
              </p>
            </div>
          </motion.aside>
        </div>

        {/* Clean Footer */}
        <footer className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.06] pt-6 pb-2 text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span>© 2026 PIXELIFY</span>
            <span>•</span>
            <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-neutral-300 transition-colors">
              Terms of Service
            </Link>
          </div>

          <span className="text-[11px] text-neutral-600">
            Local browser AI photo editor
          </span>
        </footer>
      </div>
    </main>
  );
}
