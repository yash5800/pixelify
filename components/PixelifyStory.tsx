import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/* --------------------------------------------------------------------------
   Cubic bezier solver from the original Camera Follow Captions specification.
   Newton first, bisection as fallback, exact and deterministic.
-------------------------------------------------------------------------- */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  function curve(t: number, a1: number, a2: number) {
    const A = 1 - 3 * a2 + 3 * a1;
    const B = 3 * a2 - 6 * a1;
    const C = 3 * a1;
    return ((A * t + B) * t + C) * t;
  }
  function slope(t: number, a1: number, a2: number) {
    const A = 1 - 3 * a2 + 3 * a1;
    const B = 3 * a2 - 6 * a1;
    const C = 3 * a1;
    return (3 * A * t + 2 * B) * t + C;
  }
  return function (p: number) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      const e = curve(t, x1, x2) - p;
      if (Math.abs(e) < 1e-7) return curve(t, y1, y2);
      t -= e / d;
    }
    let lo = 0;
    let hi = 1;
    t = p;
    for (let j = 0; j < 24; j++) {
      const x = curve(t, x1, x2);
      if (Math.abs(x - p) < 1e-7) break;
      if (x > p) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return curve(t, y1, y2);
  };
}

/* Leaves the mark fast, spends most of its time arriving */
const EASE_STEP = bezier(0.31, 0, 0.11, 1);
/* The closing pull back: slower to leave, glides a long way out */
const EASE_WIDE = bezier(0.42, 0, 0.14, 1);
/* Word ink coming up */
const EASE_INK = bezier(0.2, 0.7, 0.3, 1);

export type WordPlacement =
  | "right"
  | "below"
  | "right-box"
  | "below-box"
  | "auto";

export type WordConfig = {
  text: string;
  accent?: boolean;
  dim?: boolean;
  italic?: boolean;
  pos?: WordPlacement;
  relativeTo?: number | string;
  size?: number;
  gap?: number;
  dx?: number;
  dy?: number;
};

export const DEFAULT_WORDS: WordConfig[] = [
  // 1. "first word to your one by one below, images is right to the word your"
  { text: "PIXELIFY", accent: true },
  { text: "local", accent: false, pos: "below" },
  { text: "AI", accent: true, pos: "below" },
  { text: "for", accent: false, pos: "below" },
  { text: "your", accent: false, pos: "below" },
  { text: "images", accent: true, pos: "right" },

  // 2. "next upscale word below your untill word without"
  { text: "upscale", accent: true, pos: "below", relativeTo: "your" },
  { text: "restore", accent: false, pos: "below" },
  { text: "enhance", accent: true, pos: "below" },
  { text: "without", accent: false, pos: "below" },

  // 3. "uploading word goes right side of word without"
  { text: "uploading", accent: false, pos: "right" },

  // 4. "next words(anything, to, the, cloud) below the word without, but the cloud as one line like after word the right side of it word cloud."
  { text: "anything", accent: true, pos: "below", relativeTo: "without" },
  { text: "to", accent: false, pos: "below" },
  { text: "the", accent: false, pos: "below" },
  { text: "cloud", accent: true, pos: "right" },

  // 5. "next words goes below the cloud, (your, pixels) one right to other like after word your right side of it word pixels and words stay and yours one below one."
  { text: "your", accent: false, pos: "below", relativeTo: "the" },
  { text: "pixels", accent: true, pos: "right" },
  { text: "stay", accent: false, pos: "below", relativeTo: "your" },
  { text: "yours", accent: true, pos: "below" },
];

type Box = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type Word = {
  text: string;
  accent: boolean;
  dim: boolean;
  italic: boolean;
  fs: number;
  x: number;
  y: number;
  width: number;
  height: number;
  box: Box;
};

function findTarget(words: Word[], relativeTo?: number | string): Word | null {
  if (words.length === 0) return null;
  if (relativeTo === undefined) return words[words.length - 1];
  if (typeof relativeTo === "number") {
    return words[relativeTo] || words[words.length - 1];
  }
  const query = String(relativeTo).toLowerCase();
  for (let idx = words.length - 1; idx >= 0; idx--) {
    if (words[idx].text.toLowerCase() === query) {
      return words[idx];
    }
  }
  return words[words.length - 1];
}

interface PixelifyStoryProps {
  words?: WordConfig[];
  fixed?: boolean;
  className?: string;
  accentColor?: string;
  framing?: "tight" | "standard" | "wide";
  smear?: "off" | "subtle" | "standard" | "heavy";
}

export default function PixelifyStory({
  words: customWords,
  fixed = false,
  className = "",
  accentColor = "#c7ff00",
  framing = "standard",
  smear: smearSetting = "standard",
}: PixelifyStoryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const wordList = customWords || DEFAULT_WORDS;

  useLayoutEffect(() => {
    let timeline: gsap.core.Timeline | null = null;
    let resizeTimer: number | undefined;
    let lastW = 0;
    let lastH = 0;

    const build = () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const world = worldRef.current;

      if (!root || !stage || !world) return;

      if (timeline) {
        timeline.kill();
        timeline = null;
      }
      gsap.killTweensOf(world);
      gsap.set(world, { clearProps: "all" });
      world.replaceChildren();

      const FRAME_W = root.clientWidth || 1080;
      const FRAME_H = root.clientHeight || 1920;

      if (!FRAME_W || !FRAME_H) return;

      lastW = FRAME_W;
      lastH = FRAME_H;

      const FRAMINGS = { tight: 0.82, standard: 1, wide: 1.25 };
      const SMEARS = { off: 0, subtle: 0.5, standard: 1, heavy: 1.9 };

      const FRAMING = FRAMINGS[framing] || 1;
      const SMEAR = SMEARS[smearSetting] || 1;

      const STEP = 0.52;
      const MOVE = 0.4;
      const MARGIN = 1.36 * FRAMING;

      root.style.setProperty("--cf-accent", accentColor);
      root.style.setProperty("--ink", "#ffffff");

      /* Base size is picked so opening shot sits near 1:1. Everything after it
         is a pull back, so the world is only ever scaled down and type stays crisp. */
      const BASE = Math.max(FRAME_W, FRAME_H) * 0.16;

      const ruler = document.createElement("div");
      ruler.style.cssText =
        "position:absolute;left:-99999px;top:0;white-space:nowrap;visibility:hidden;pointer-events:none;" +
        'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:700;' +
        "text-transform:uppercase;letter-spacing:0.005em;line-height:0.78";
      root.appendChild(ruler);

      /* Re-derive camera framing: Centers the active box in the frame */
      function poseFor(b: Box, margin: number) {
        const bw = (b.x1 - b.x0) * margin;
        const bh = (b.y1 - b.y0) * margin;
        const s = Math.min(FRAME_W / bw, FRAME_H / bh);
        return {
          x: FRAME_W / 2 - (s * (b.x0 + b.x1)) / 2,
          y: FRAME_H / 2 - (s * (b.y0 + b.y1)) / 2,
          scale: s,
        };
      }

      // Initial word dimensions and camera scale
      ruler.style.fontSize = `${BASE}px`;
      ruler.textContent = wordList[0].text;
      const w0 = Math.ceil(ruler.getBoundingClientRect().width);
      const h0 = BASE * 0.78;
      const s0 = poseFor({ x0: 0, y0: 0, x1: w0, y1: h0 }, MARGIN).scale;

      let box: Box | null = null;
      const words: Word[] = [];
      let currentScale = s0;

      wordList.forEach((wd, i) => {
        const target = i > 0 ? findTarget(words, wd.relativeTo) : null;
        const pos: WordPlacement = wd.pos || "auto";

        let fs: number;
        if (i === 0) {
          fs = BASE;
        } else if (pos === "right" && target) {
          // Words on the same line share the exact font size of their row
          fs = target.fs;
        } else {
          // Dynamic scaling: guarantees EVERY incoming word (including after AI)
          // has the same big, impactful view size as PIXELIFY, while previous words
          // smoothly shrink and retain in the composition!
          const nextIsRight = i + 1 < wordList.length && wordList[i + 1].pos === "right";
          const nextWord = nextIsRight ? wordList[i + 1] : null;
          const totalChars = wd.text.length + (nextWord ? nextWord.text.length + 1 : 0);
          const widthFactor = totalChars > 9 ? Math.max(0.68, 9.5 / totalChars) : 1;
          fs = BASE * (s0 / currentScale) * widthFactor;
          if (wd.size !== undefined) fs *= wd.size;
        }

        ruler.style.fontSize = `${fs}px`;
        ruler.textContent = wd.text;
        const w = Math.ceil(ruler.getBoundingClientRect().width);
        const h = fs * 0.78;
        const lineGap = fs * 0.08;
        const spaceGap = Math.round(fs * 0.22);

        let x = 0;
        let y = 0;

        if (i === 0) {
          x = 0;
          y = 0;
        } else if (pos === "right" && target) {
          x = target.x + target.width + (wd.gap !== undefined ? wd.gap : spaceGap);
          y = target.y;
        } else if (pos === "below" && target) {
          x = target.x;
          y = target.y + target.height + (wd.gap !== undefined ? wd.gap : lineGap);
        } else if (pos === "right-box") {
          x = box!.x1 + (wd.gap !== undefined ? wd.gap : spaceGap);
          y = box!.y1 - h;
        } else if (pos === "below-box") {
          x = box!.x0;
          y = box!.y1 + (wd.gap !== undefined ? wd.gap : lineGap);
        } else {
          // Source HTML auto-flow condition
          if ((box!.x1 - box!.x0) / (box!.y1 - box!.y0) < FRAME_W / FRAME_H) {
            x = box!.x1 + spaceGap;
            y = box!.y1 - h;
          } else {
            x = box!.x0;
            y = box!.y1 + lineGap;
          }
        }

        if (wd.dx) x += wd.dx;
        if (wd.dy) y += wd.dy;

        const nextBox: Box = box
          ? {
              x0: Math.min(box.x0, x),
              y0: Math.min(box.y0, y),
              x1: Math.max(box.x1, x + w),
              y1: Math.max(box.y1, y + h),
            }
          : { x0: x, y0: y, x1: x + w, y1: y + h };

        box = nextBox;
        const p = poseFor(nextBox, MARGIN);
        currentScale = p.scale;

        words.push({
          text: wd.text,
          accent: !!wd.accent,
          dim: !!wd.dim,
          italic: !!wd.italic,
          fs,
          x,
          y,
          width: w,
          height: h,
          box: { ...nextBox },
        });
      });

      root.removeChild(ruler);

      /* Create word elements */
      const els: HTMLDivElement[] = words.map((wd) => {
        const el = document.createElement("div");
        el.className =
          "cf-word pixelify-word" + (wd.accent ? " is-accent pixelify-accent" : "");
        if (wd.dim) el.classList.add("pixelify-dim");
        if (wd.italic) el.classList.add("pixelify-italic");
        el.textContent = wd.text;
        el.style.left = `${wd.x}px`;
        el.style.top = `${wd.y}px`;
        el.style.fontSize = `${wd.fs}px`;
        world.appendChild(el);
        return el;
      });

      /* Force browser layout */
      els.forEach((el) => {
        void el.offsetWidth;
      });

      /* Re-derive framing box from real browser layout coordinates */
      let run: Box | null = null;
      els.forEach((el, i) => {
        const r: Box = {
          x0: el.offsetLeft,
          y0: el.offsetTop,
          x1: el.offsetLeft + el.offsetWidth,
          y1: el.offsetTop + el.offsetHeight,
        };
        run = run
          ? {
              x0: Math.min(run.x0, r.x0),
              y0: Math.min(run.y0, r.y0),
              x1: Math.max(run.x1, r.x1),
              y1: Math.max(run.y1, r.y1),
            }
          : r;
        words[i].box = { x0: run.x0, y0: run.y0, x1: run.x1, y1: run.y1 };
      });
      const FULL = run || box;
      if (!FULL) return;

      /* Rest state pinned outside timeline */
      const first = poseFor(words[0].box, MARGIN);
      gsap.set(world, {
        transformOrigin: "0 0",
        x: first.x,
        y: first.y,
        scale: first.scale,
        force3D: true,
      });
      gsap.set(els, { opacity: 0 });
      gsap.set(els[0], { opacity: 1 });

      const tl = gsap.timeline({ paused: true });
      timeline = tl;

      /* Step through all words with ink arrival and camera follow (sharp, zero blur) */
      words.forEach((wd, i) => {
        const t = i * STEP;
        if (i === 0) return;

        tl.fromTo(
          els[i],
          { opacity: 0 },
          { opacity: 1, duration: 0.16, ease: EASE_INK },
          t
        );

        const p = poseFor(wd.box, MARGIN);
        tl.to(
          world,
          { x: p.x, y: p.y, scale: p.scale, duration: MOVE, ease: EASE_STEP },
          t
        );
      });

      /* The resolve: full word view pull back carried all the way out */
      const wide = poseFor(FULL, 1.2 * FRAMING);
      const wideAt = (words.length - 1) * STEP + 0.62;
      tl.to(
        world,
        {
          x: wide.x,
          y: wide.y,
          scale: wide.scale,
          duration: 0.94,
          ease: EASE_WIDE,
        },
        wideAt
      );

      /* Hold on the full word view resolve before looping cleanly */
      const holdDuration = 2.4;
      const totalDur = wideAt + 0.94 + holdDuration;
      tl.set({}, {}, totalDur);

      function play() {
        tl.restart();
      }

      tl.eventCallback("onComplete", play);
      play();
    };

    build();

    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const root = rootRef.current;
        if (!root) return;
        const w = root.clientWidth || window.innerWidth;
        const h = root.clientHeight || window.innerHeight;
        if (Math.abs(w - lastW) > 10 || Math.abs(h - lastH) > 40) {
          build();
        }
      }, 150);
    });

    if (rootRef.current) {
      ro.observe(rootRef.current);
    }

    return () => {
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      if (timeline) {
        timeline.kill();
        timeline = null;
      }
      if (worldRef.current) {
        gsap.killTweensOf(worldRef.current);
        worldRef.current.replaceChildren();
      }
    };
  }, [wordList, accentColor, framing, smearSetting]);

  return (
    <div
      ref={rootRef}
      className={`clip cf-root pixelify-story ${fixed ? "cf-root--fixed pixelify-story--fixed" : ""} ${className}`}
      data-composition-id="caption-camera-follow"
    >
      <div id="cf-stage" ref={stageRef} className="cf-stage pixelify-stage">
        <div id="cf-world" ref={worldRef} className="cf-world pixelify-world" />
      </div>
      <div id="cf-vignette" className="cf-vignette pixelify-vignette" />
    </div>
  );
}

