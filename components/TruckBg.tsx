"use client";

import { useEffect, useRef } from "react";

type TruckBGProps = {
  className?: string;
  opacity?: number;
  backgroundColor?: string;
};

type Star = {
  x: number;
  y: number;

  // Visual size
  radius: number;

  // Brightness when ON
  brightness: number;

  // Current state
  visible: boolean;

  // Current alpha
  alpha: number;

  // Target alpha
  targetAlpha: number;

  // How quickly this star changes
  fadeSpeed: number;

  // When it is allowed to change again
  nextChange: number;

  // Random timing seed
  seed: number;
};

export default function TruckBG({
  className = "",
  opacity = 1,
  backgroundColor = "#000000",
}: TruckBGProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    let animationFrame = 0;

    const stars: Star[] = [];

    /*
     * ---------------------------------------------------------
     * Deterministic random generator
     * ---------------------------------------------------------
     *
     * The positions stay identical between renders.
     */
    let randomSeed = 918273;

    const random = () => {
      randomSeed =
        (randomSeed * 1664525 + 1013904223) >>> 0;

      return randomSeed / 4294967296;
    };

    /*
     * ---------------------------------------------------------
     * Create star field
     * ---------------------------------------------------------
     */
    const createStars = () => {
      stars.length = 0;

      randomSeed = 918273;

      /*
       * Larger spacing than the previous version.
       *
       * This is important because the supplied video has
       * noticeably larger individual dots.
       */
      const spacing = Math.max(
        26,
        Math.min(38, Math.min(width, height) / 22)
      );

      const columns =
        Math.ceil(width / spacing) + 2;

      const rows =
        Math.ceil(height / spacing) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < columns; col++) {
          /*
           * Don't make it a mathematically perfect grid.
           */
          const jitterX =
            (random() - 0.5) *
            spacing *
            0.35;

          const jitterY =
            (random() - 0.5) *
            spacing *
            0.35;

          const x =
            col * spacing +
            spacing * 0.5 +
            jitterX;

          const y =
            row * spacing +
            spacing * 0.5 +
            jitterY;

          /*
           * Most dots have roughly the same size,
           * with some slightly larger ones.
           */
          let radius =
            1.25 +
            random() * 0.8;

          /*
           * Occasional larger star.
           */
          if (random() > 0.90) {
            radius += 0.45 + random() * 0.45;
          }

          /*
           * Most stars aren't fully white.
           */
          const brightness =
            0.55 +
            random() * 0.40;

          /*
           * Random initial state.
           *
           * This is important:
           * the entire field does NOT appear simultaneously.
           */
          const visible =
            random() > 0.45;

          const alpha =
            visible
              ? brightness
              : 0;

          /*
           * Individual fade speed.
           */
          const fadeSpeed =
            0.025 +
            random() * 0.065;

          /*
           * Each star receives its own independent
           * future activation time.
           */
          const nextChange =
            performance.now() +
            300 +
            random() * 2200;

          stars.push({
            x,
            y,
            radius,
            brightness,
            visible,
            alpha,
            targetAlpha: alpha,
            fadeSpeed,
            nextChange,
            seed: random(),
          });
        }
      }
    };

    /*
     * ---------------------------------------------------------
     * Resize
     * ---------------------------------------------------------
     */
    const resize = () => {
      const rect =
        canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      width = rect.width;
      height = rect.height;

      dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      canvas.width =
        Math.round(width * dpr);

      canvas.height =
        Math.round(height * dpr);

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      createStars();
    };

    /*
     * ---------------------------------------------------------
     * Random ON/OFF behavior
     * ---------------------------------------------------------
     */
    const updateStar = (
      star: Star,
      now: number
    ) => {
      /*
       * When the star reaches its random change time,
       * switch it to the opposite state.
       */
      if (now >= star.nextChange) {
        star.visible = !star.visible;

        if (star.visible) {
          /*
           * TURN ON
           */
          star.targetAlpha =
            star.brightness;

          /*
           * Once ON, keep it there for a random
           * amount of time.
           */
          star.nextChange =
            now +
            180 +
            Math.random() * 1400;
        } else {
          /*
           * TURN OFF
           */
          star.targetAlpha = 0;

          /*
           * Stay OFF for a random amount of time.
           *
           * This creates the actual blinking behavior.
           */
          star.nextChange =
            now +
            250 +
            Math.random() * 2200;
        }
      }

      /*
       * Smoothly approach target alpha.
       *
       * This prevents ugly hard cuts while still
       * producing a genuine ON/OFF cycle.
       */
      const difference =
        star.targetAlpha -
        star.alpha;

      star.alpha +=
        difference *
        star.fadeSpeed;

      /*
       * Snap very small values to zero.
       */
      if (
        !star.visible &&
        star.alpha < 0.015
      ) {
        star.alpha = 0;
      }

      /*
       * Snap almost fully ON stars.
       */
      if (
        star.visible &&
        Math.abs(
          star.targetAlpha -
          star.alpha
        ) < 0.01
      ) {
        star.alpha =
          star.targetAlpha;
      }
    };

    /*
     * ---------------------------------------------------------
     * Render
     * ---------------------------------------------------------
     */
    const render = (now: number) => {
      /*
       * Background color (configurable, defaults to pure black).
       */
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      for (const star of stars) {
        updateStar(star, now);

        if (star.alpha <= 0.005) {
          continue;
        }

        /*
         * Main star.
         */
        ctx.beginPath();

        ctx.arc(
          star.x,
          star.y,
          star.radius,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          `rgba(235, 238, 242, ${star.alpha})`;

        ctx.fill();

        /*
         * Very subtle glow for brighter stars.
         *
         * Not every star gets this.
         */
        if (
          star.alpha > 0.65 &&
          star.radius > 1.45
        ) {
          ctx.beginPath();

          ctx.arc(
            star.x,
            star.y,
            star.radius * 1.8,
            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            `rgba(235, 240, 245, ${
              star.alpha * 0.08
            })`;

          ctx.fill();
        }
      }

      animationFrame =
        requestAnimationFrame(render);
    };

    /*
     * Initial setup.
     */
    resize();

    const resizeObserver =
      new ResizeObserver(resize);

    resizeObserver.observe(canvas);

    animationFrame =
      requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`
        pointer-events-none
        absolute
        inset-0
        h-full
        w-full
        ${className}
      `}
      style={{
        opacity,
      }}
    />
  );
}