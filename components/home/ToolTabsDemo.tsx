'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

const TOOLS = [
  {
    id: 'backdrop',
    label: 'Backdrop',
    copy: 'Photo, colour or the blurred original behind the cutout.',
  },
  {
    id: 'effects',
    label: 'Effects',
    copy: 'Drop shadow, edge stroke and exposure on the subject alone.',
  },
  {
    id: 'crop',
    label: 'Crop',
    copy: 'Transform, mirror and lock to a social ratio without re-cutting.',
  },
  {
    id: 'design',
    label: 'Design',
    copy: 'Headline, sticker and layers export with the image.',
  },
] as const;

type ToolId = (typeof TOOLS)[number]['id'];

/**
 * The four post-cutout tools as one running preview: each tab applies a real
 * change to the same cutout, so the panel switches instead of loading a new
 * screenshot. Auto-advances while in view, pauses the moment you hover or
 * focus it, and is driven as a real tablist: arrow keys, Home and End move
 * between tools, and each tab owns the panel it controls.
 */
export function ToolTabsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  const reduce = useReducedMotion();
  const uid = useId();
  const [active, setActive] = useState<ToolId>('backdrop');
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!inView || held || reduce) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const index = TOOLS.findIndex((tool) => tool.id === current);
        return TOOLS[(index + 1) % TOOLS.length].id;
      });
    }, 3600);
    return () => window.clearInterval(timer);
  }, [inView, held, reduce]);

  const current = TOOLS.find((tool) => tool.id === active) ?? TOOLS[0];

  const select = useCallback((index: number, focus = false) => {
    const tool = TOOLS[(index + TOOLS.length) % TOOLS.length];
    setActive(tool.id);
    setHeld(true);
    if (focus) tabs.current[(index + TOOLS.length) % TOOLS.length]?.focus();
  }, []);

  return (
    <div
      className="fh-tools-demo"
      ref={ref}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <div
        className={`fh-tools-stage${active === 'crop' ? ' is-cropping' : ''}`}
        data-tab={active}
        aria-labelledby={`${uid}-tab-${active}`}
        aria-describedby={`${uid}-panel`}
      >
        <div className="fh-tools-bg fh-tools-bg--backdrop" aria-hidden="true" />
        <div className="fh-tools-bg fh-tools-bg--effects" aria-hidden="true" />
        <div className="fh-tools-bg fh-tools-bg--crop" aria-hidden="true" />
        <div className="fh-tools-bg fh-tools-bg--design" aria-hidden="true" />
        <img
          className="fh-tools-subject"
          src="/home/studio/live-cut-subject.webp"
          alt="A cut out pair of headphones being finished in the Pixelify editor"
          loading="lazy"
        />
        <div className="fh-tools-design" aria-hidden="true">
          <span className="fh-tools-design-line">Lights, camera, cutout.</span>
          <span className="fh-tools-design-tag">Chopper · PNG</span>
        </div>
        <span className="fh-tools-crop-frame" aria-hidden="true" />
      </div>

      <div
        className="fh-tools-tabs"
        role="tablist"
        aria-label="Editor tools"
        aria-orientation="horizontal"
        onKeyDown={(event) => {
          const index = TOOLS.findIndex((tool) => tool.id === active);
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            select(index + 1, true);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            select(index - 1, true);
          } else if (event.key === 'Home') {
            event.preventDefault();
            select(0, true);
          } else if (event.key === 'End') {
            event.preventDefault();
            select(TOOLS.length - 1, true);
          }
        }}
      >
        {TOOLS.map((tool, index) => (
          <button
            key={tool.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            id={`${uid}-tab-${tool.id}`}
            type="button"
            role="tab"
            aria-selected={tool.id === active}
            aria-controls={`${uid}-panel`}
            tabIndex={tool.id === active ? 0 : -1}
            className={`fh-tools-tab${tool.id === active ? ' is-active' : ''}`}
            onClick={() => select(index)}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <p
        className="fh-tools-copy"
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${active}`}
        tabIndex={0}
        key={current.id}
      >
        <strong>{current.label}</strong> {current.copy}
      </p>
    </div>
  );
}
