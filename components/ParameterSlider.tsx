import React, { useRef, useState } from "react";
import { Info } from "lucide-react";

interface ParameterSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  info?: string;
  disabled?: boolean;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  info,
  disabled = false,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const percentage =
    ((value - min) / (max - min)) * 100;

  const clamp = (num: number) =>
    Math.min(max, Math.max(min, num));

  const updateValue = (clientX: number) => {
    if (!sliderRef.current || disabled) return;

    const rect = sliderRef.current.getBoundingClientRect();

    const x = clientX - rect.left;

    const percent = clamp(
      (x / rect.width) * 100
    );

    const rawValue =
      min + ((max - min) * percent) / 100;

    const stepped =
      Math.round((rawValue - min) / step) * step;

    onChange(
      clamp(
        Number(
          (min + stepped).toFixed(2)
        )
      )
    );
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (disabled) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    setDragging(true);

    updateValue(e.clientX);
  };

  const handlePointerMove = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!dragging || disabled) return;

    updateValue(e.clientX);
  };

  const handlePointerUp = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    setDragging(false);

    if (
      e.currentTarget.hasPointerCapture(
        e.pointerId
      )
    ) {
      e.currentTarget.releasePointerCapture(
        e.pointerId
      );
    }
  };

  return (
    <div
      className={`
        w-full
        ${disabled ? "opacity-40 pointer-events-none" : ""}
      `}
    >
      {/* LABEL */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[14px] font-medium text-white/65">
          {label}
        </span>

        {info && (
          <div className="group relative">
            <Info
              size={13}
              strokeWidth={2}
              className="text-white/40 hover:text-white/70 transition-colors cursor-help"
            />

            <div
              className="
                pointer-events-none
                absolute
                bottom-full
                left-0
                -translate-x-3
                z-50
                mb-2
                hidden
                w-64
                rounded-xl
                border border-white/15
                bg-[#18181c]
                p-3
                text-[11.5px]
                leading-relaxed
                text-white/90
                shadow-[0_12px_32px_rgba(0,0,0,0.6)]
                backdrop-blur-md
                group-hover:block
              "
            >
              <div className="relative z-10">{info}</div>
              <div className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 border-b border-r border-white/15 bg-[#18181c]" />
            </div>
          </div>
        )}
      </div>

      {/* ==================================================
          SINGLE WIDE SLIDER BOX
         ================================================== */}

      <div
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`
          relative
          h-[58px]
          w-full
          overflow-hidden
          rounded-[10px]
          border
          border-white/[0.035]
          bg-[#101010]
          cursor-ew-resize
          touch-none
          select-none
          ${dragging ? "cursor-grabbing" : ""}
        `}
      >
        {/* ==================================================
            LEFT / ACTIVE AREA
           ================================================== */}

        <div
          className="
            absolute
            inset-y-0
            left-0
            bg-[#242424]
          "
          style={{
            width: `${percentage}%`,
          }}
        />

        {/* ==================================================
            VALUE (display only — values are adjusted with the
            drag bar only, never typed manually)
           ================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            left-0
            top-0
            z-20
            flex
            h-full
            items-center
            px-4
            text-[16px]
            font-medium
            text-white/75
          "
        >
          {value}
        </div>

        {/* ==================================================
            VERTICAL DRAG HANDLE
           ================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            top-1/2
            z-30
            h-[32px]
            w-[3px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white
            shadow-[0_0_8px_rgba(255,255,255,0.18)]
          "
          style={{
            left: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
};

export default ParameterSlider;