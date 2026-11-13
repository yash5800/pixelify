'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { CutoutDemo } from './CutoutDemo';
import { StudioRange } from './StudioRange';

/**
 * The cutout card: the live frame plus a panel whose brush actually changes
 * the matte, so the tools read as tools and not as paint.
 */

const TOOLS = {
  move: {
    label: 'Move',
    icon: '✋',
    hint: (
      <>
        Drag the divider to compare. Pick <b>Erase</b> or <b>Restore</b> to edit
        the matte itself.
      </>
    ),
    status: 'Alpha matte refined',
    ann: 'Move tool — drag the divider to compare',
  },
  erase: {
    label: 'Erase',
    icon: '✂',
    hint: (
      <>
        Brush over leftover background. The alpha matte updates as you paint.
      </>
    ),
    status: 'Erase brush · matte edits on',
    ann: 'Erase brush — remove leftover background',
  },
  restore: {
    label: 'Restore',
    icon: '✦',
    hint: (
      <>
        Paint back any part of the subject you removed. Every stroke stays on
        the matte.
      </>
    ),
    status: 'Restore brush · matte edits on',
    ann: 'Restore brush — paint the subject back in',
  },
} as const;

type ToolKey = keyof typeof TOOLS;

export function CutoutBlock() {
  const [tool, setTool] = useState<ToolKey>('move');
  const [brushSize, setBrushSize] = useState(44);
  const [dirty, setDirty] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1900);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const active = TOOLS[tool];
  const brushMode = tool !== 'move';

  return (
    <div className="fh-work-card">
      <div className="fh-shotbar">
        <span className="fh-shotbar-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="fh-shotbar-title">BG Remover · headphones.jpg</span>
        <span className="fh-shotbar-tag">Clean Cutout · Chopper</span>
      </div>
      <div className="fh-work-stage">
        <div className="fh-work-visual fh-work-visual--cutout">
          <CutoutDemo
            tool={tool}
            brushSize={brushSize}
            resetToken={resetToken}
            onEdited={() => {
              setDirty(true);
              setStatus(
                `${TOOLS[tool].label} stroke applied — alpha matte updated`
              );
            }}
          />
        </div>
        <aside className="fh-work-panel">
          <span className="fh-work-panel-title">Cutout Tools</span>
          <div className="fh-work-toggle" role="group" aria-label="Cutout tool">
            {(Object.keys(TOOLS) as ToolKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`fh-ui${tool === key ? ' is-active' : ''}`}
                aria-pressed={tool === key}
                onClick={() => {
                  setTool(key);
                  setStatus(TOOLS[key].ann);
                }}
              >
                <span aria-hidden="true">{TOOLS[key].icon}</span> {TOOLS[key].label}
              </button>
            ))}
          </div>
          <p className="fh-work-hint">{active.hint}</p>
          {brushMode && (
            <div className="fh-brush-controls">
              <StudioRange
                label="Brush size"
                value={brushSize}
                min={10}
                max={120}
                unit="px"
                onChange={setBrushSize}
              />
              {dirty && (
                <button
                  type="button"
                  className="fh-brush-reset"
                  onClick={() => {
                    setResetToken((token) => token + 1);
                    setDirty(false);
                    setStatus('Alpha matte reset');
                  }}
                >
                  Reset matte
                </button>
              )}
            </div>
          )}
          <span className={`fh-chip-sm is-green`}>
            {brushMode && dirty ? 'Matte edited · on-device' : active.status}
          </span>
          <button
            type="button"
            className="fh-ui fh-studio-download"
            onClick={() => {
              setSaved(true);
              setStatus('Downloaded headphones-cutout.png — transparent, 2400 × 1600');
            }}
          >
            <Download size={12} strokeWidth={2.2} aria-hidden="true" />
            {saved ? 'Saved' : 'Download'}
          </button>
          <p className="fh-sr" role="status">
            {status}
          </p>
        </aside>
      </div>
    </div>
  );
}
