'use client';

import { useId } from 'react';

interface StudioRangeProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  /** Lower bound of the range (default 0). */
  min?: number;
  /** Upper bound of the range (default 100). */
  max?: number;
  /** Suffix shown next to the value, e.g. "px". */
  unit?: string;
}

/**
 * The mock's slider, driven by a real range input: arrows step 1, Page Up /
 * Down step 10, Home / End jump the ends, and the drawn rail follows the value
 * so the pixels and the number never disagree.
 */
export function StudioRange({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '',
}: StudioRangeProps) {
  const id = useId();
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="fh-studio-slider">
      <div className="fh-studio-slider-head">
        <label htmlFor={id}>{label}</label>
        <b>
          {value}
          {unit}
        </b>
      </div>
      <div className="fh-studio-track fh-studio-track--live">
        <i style={{ width: `${percent}%` }} />
        <input
          id={id}
          className="fh-studio-range"
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-valuetext={`${value}${unit}`}
        />
      </div>
    </div>
  );
}
