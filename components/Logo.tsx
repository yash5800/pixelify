import React from "react";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

const SIZE = {
    sm: "text-[2.4rem]",
    md: "text-[4rem]",
    lg: "text-[6rem]",
    xl: "text-[8rem]",
};

const letters = [
    {
        char: "P",
        gradient: "linear-gradient(180deg, #ff777b 0%, #ff646b 52%, #f0444f 100%)",
        shadow: "#8d2e32",
    },
    {
        char: "I",
        gradient: "linear-gradient(180deg, #ffc66e 0%, #f6a94e 50%, #ed6262 100%)",
        shadow: "#884b36",
    },
    {
        char: "X",
        gradient: "linear-gradient(180deg, #f6ff68 0%, #efff5c 48%, #d9ee52 100%)",
        shadow: "#687a2c",
    },
    {
        char: "E",
        gradient: "linear-gradient(180deg, #d7ff4c 0%, #5bfa67 48%, #32dc62 100%)",
        shadow: "#226d45",
    },
    {
        char: "L",
        gradient: "linear-gradient(180deg, #42f6ef 0%, #40e8f1 42%, #465ce9 100%)",
        shadow: "#263a8b",
    },
    {
        char: "I",
        gradient: "linear-gradient(180deg, #52f4ee 0%, #42dfe9 45%, #4b5ced 100%)",
        shadow: "#293982",
    },
    {
        char: "F",
        gradient: "linear-gradient(180deg, #b84aff 0%, #8749ee 42%, #4355e7 100%)",
        shadow: "#382d83",
    },
    {
        char: "Y",
        gradient: "linear-gradient(180deg, #ef43ad 0%, #e945a5 45%, #ed4b54 100%)",
        shadow: "#813044",
    },
];

export default function Logo({
    className = "",
    size = "md",
}: LogoProps) {
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
        .pixelify-logo {
          font-family: "Minecrafter", monospace;
        }
          
        .pixelify-letter {
          position: relative;
          display: inline-block;
          isolation: isolate;
        }

        /*
         * Main colored face
         */
        .pixelify-face {
          position: relative;
          z-index: 5;

          background-image: var(--pixelify-gradient);
          background-size: 100% 100%;

          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;

          /*
           * Small dark edge around the colored face.
           */
          -webkit-text-stroke: 1px rgba(25, 25, 25, 0.25);
        }

        /*
         * White Minecraft-style square highlight.
         */
        .pixelify-highlight {
          position: absolute;
          z-index: 10;

          width: 0.105em;
          height: 0.105em;

          top: 0.26em;
          left: 0.08em;

          background: #ffffff;

          box-shadow:
             0 0 0 1px rgba(255, 255, 255, 0.12),
             0 0 4px rgba(255, 255, 255, 0.18);

          pointer-events: none;
        }

        /*
         * First extrusion layer.
         */
        .pixelify-extrude-1 {
          position: absolute;
          z-index: 1;

          top: 0.075em;
          left: 0.075em;

          color: var(--pixelify-shadow);

          opacity: 0.95;

          text-shadow:
            0.025em 0.025em 0 var(--pixelify-shadow),
            0.05em 0.05em 0 var(--pixelify-shadow),
            0.075em 0.075em 0 var(--pixelify-shadow);
        }

        /*
         * Deep black/brown edge.
         */
        .pixelify-extrude-dark {
          position: absolute;
          z-index: 0;

          top: 0.115em;
          left: 0.115em;

          color: #202020;

          opacity: 0.9;

          text-shadow:
            0.025em 0.025em 0 #181818,
            0.05em 0.05em 0 #181818,
            0.075em 0.075em 0 #181818;
        }

        /*
         * Tiny colored bottom edge.
         */
        .pixelify-bottom-edge {
          position: absolute;
          z-index: 2;

          top: 0.045em;
          left: 0.045em;

          color: var(--pixelify-shadow);

          opacity: 0.95;
        }
      `}} />

            <div
                className={`
          pixelify-logo
          ${SIZE[size]}
          ${className}
        `}
                aria-label="PIXELIFY"
                role="img"
            >
                {letters.map((letter, index) => (
                    <span
                        key={`${letter.char}-${index}`}
                        className="pixelify-letter"
                        style={
                            {
                                "--pixelify-gradient": letter.gradient,
                                "--pixelify-shadow": letter.shadow,
                            } as React.CSSProperties
                        }
                    >
                        {/* Deep dark extrusion */}
                        <span
                            aria-hidden="true"
                            className="pixelify-extrude-dark"
                        >
                            {letter.char}
                        </span>

                        {/* Colored extrusion */}
                        <span
                            aria-hidden="true"
                            className="pixelify-extrude-1"
                        >
                            {letter.char}
                        </span>

                        {/* Small colored lower edge */}
                        <span
                            aria-hidden="true"
                            className="pixelify-bottom-edge"
                        >
                            {letter.char}
                        </span>

                        {/* Main face */}
                        <span className="pixelify-face">
                            {letter.char}
                        </span>

                        {/* White square */}
                        <span
                            aria-hidden="true"
                            className="pixelify-highlight"
                        />
                    </span>
                ))}
            </div>
        </>
    );
}