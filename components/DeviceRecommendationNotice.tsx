import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MonitorSmartphone,
  Bell,
} from 'lucide-react';

type PixelifyTool = 'bg_remove' | 'upscale';

interface DeviceRecommendationNoticeProps {
  tool: PixelifyTool;
  className?: string;
}

const STORAGE_KEY = 'pixelify-device-notice-dismissed';

const TOOL_CONTENT: Record<
  PixelifyTool,
  { title: string; description: string }
> = {
  bg_remove: {
    title: 'A smoother experience on desktop',
    description:
      'Pixelify works on mobile, too! For potentially faster AI Image Background Removal, we recommend using a desktop or laptop.',
  },
  upscale: {
    title: 'A smoother experience on desktop',
    description:
      'Pixelify works on mobile, too! For potentially faster AI Image Upscaling, we recommend using a desktop or laptop.',
  },
};

/**
 * Client-side device detection. `next/headers` / `next/server` are
 * server-only APIs and crash any client component that imports them;
 * UA sniffing + coarse-pointer matching runs everywhere the notice can.
 */
function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  try {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export default function DeviceRecommendationNotice({
  tool,
  className = '',
}: DeviceRecommendationNoticeProps) {
  const [mobile, setMobile] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const prefersReducedMotion = useReducedMotion();
  const content = TOOL_CONTENT[tool];

  useEffect(() => {
    setMobile(detectMobile());
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      // If storage is unavailable, never nag: hide the notice instead.
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);

    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // The notice still closes for the current render.
    }
  };

  if (mobile !== true || dismissed) return null;

  return (
    <motion.aside
      initial={
        prefersReducedMotion
          ? false
          : { opacity: 0, y: 8 }
      }
      animate={{ opacity: 1, y: 0 }}
      exit={
        prefersReducedMotion
          ? undefined
          : { opacity: 0, y: -6 }
      }
      transition={{ duration: 0.25, ease: 'easeOut' }}
      aria-label="Desktop experience recommendation"
      className={`
        relative isolate w-full overflow-hidden
        rounded-2xl border border-white/[0.09]
        bg-[#101512]
        shadow-[0_8px_30px_rgba(0,0,0,0.12)]
        ${className}
      `}
    >
      {/* Subtle green ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-16 -top-20
          h-44 w-44 rounded-full
          bg-[#00FF85]/[0.06] blur-3xl
        "
      />

      <div
        className="
          relative flex flex-col gap-4 p-4
          sm:flex-row sm:items-start sm:gap-4 sm:p-5
        "
      >
        {/* Icon */}
        <div
          className="
            flex h-10 w-10 shrink-0 items-center
            justify-center rounded-xl
            border border-[#00FF85]/20
            bg-[#00FF85]/[0.08]
            sm:h-11 sm:w-11
          "
          aria-hidden="true"
        >
          <MonitorSmartphone
            className="h-5 w-5 text-[#48E99A]"
            strokeWidth={1.8}
          />
        </div>

        {/* Message */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-white sm:text-base">
              {content.title}
            </h3>

            <span
              className="
                inline-flex items-center gap-1
                rounded-full border border-[#00FF85]/15
                bg-[#00FF85]/[0.07]
                px-2 py-0.5 text-[10px]
                font-semibold tracking-wide
                text-[#6CEBAB] sm:text-[11px]
              "
            >
              <Bell
                className="h-3 w-3"
                aria-hidden="true"
              />
              QUICK TIP
            </span>
          </div>

          <p
            className="
              mt-1.5 max-w-3xl text-xs leading-5
              text-[#A8B2AB]
              sm:text-sm sm:leading-6
            "
          >
            {content.description}
          </p>
        </div>

        {/* Acknowledge button */}
        <div className="flex shrink-0 justify-end sm:pt-0.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="
              inline-flex min-h-10 items-center
              justify-center gap-2 rounded-xl
              border border-[#00FF85]/20
              bg-[#00FF85] px-4 py-2
              text-xs font-semibold text-[#07140C]
              shadow-[0_2px_12px_rgba(0,255,133,0.08)]
              transition-all duration-200
              hover:bg-[#72FFB4]
              active:scale-[0.98]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#48E99A]
              focus-visible:ring-offset-2
              focus-visible:ring-offset-[#101512]
              sm:text-sm
            "
          >
            I understand
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
