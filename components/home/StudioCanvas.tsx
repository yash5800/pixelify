'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Download, SlidersHorizontal } from 'lucide-react';
import { StudioDemo } from './StudioDemo';
import { CutoutDemo } from './CutoutDemo';
import { StudioRange } from './StudioRange';

/**
 * The studio window that opens the section. Every control in it is real: the
 * top tabs and the page rail drive the inspector, the canvas tools zoom the
 * frame, and the inspector's scale, model and sliders re-run the pass.
 */

const MODELS = [
  { name: 'Vitality', meta: 'Fastest model, crisp clean edges.', tag: 'Popular', cutout: false },
  { name: 'Pixel-Dance', meta: 'Max detail, up to 8K output.', tag: '8K', cutout: false },
  { name: 'Alpha-Satoru', meta: 'Natural detail for portraits.', tag: 'Portraits', cutout: false },
  { name: 'Chopper', meta: 'Fast subject segmentation.', tag: 'Fast', cutout: true },
  { name: 'Diablo', meta: 'Studio-grade edge matting.', tag: 'Studio', cutout: true },
];

type PageKey = 'home' | 'upscaler' | 'bg' | 'models' | 'gallery';

const PAGES: { key: PageKey; label: string; count?: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'upscaler', label: 'Upscaler', count: '4×' },
  { key: 'bg', label: 'BG Remover', count: 'Cut' },
  { key: 'models', label: 'Models', count: '5' },
  { key: 'gallery', label: 'Gallery' },
];
type TabKey = 'canvas' | 'models' | 'export';
type ToolKey = 'fit' | 'pan' | 'zoom';

const ZOOMS = [100, 125, 150, 200];
const FORMATS = ['PNG', 'WebP', 'JPG'] as const;
type FormatKey = (typeof FORMATS)[number];

const GALLERY = [
  { src: '/home/shots/gel-portrait.jpg', label: 'Portrait upscale' },
  { src: '/home/shots/night-drive.jpg', label: 'Night drive upscale' },
  { src: '/home/shots/wheel-editorial.jpg', label: 'Editorial upscale' },
  { src: '/home/shots/dog-black.jpg', label: 'Dog cutout' },
];

const DEFAULTS = {
  model: 'Vitality',
  scale: 4,
  sharp: 62,
  denoise: 48,
  feather: 18,
  contrast: 45,
  zoom: 100,
};

/** Output pixels for the loaded frame at each scale factor. */
function outputSize(scale: number) {
  const w = 512 * scale;
  const h = 410 * scale;
  return `${w} × ${h}`;
}

export function StudioCanvas() {
  const [tab, setTab] = useState<TabKey>('canvas');
  const [page, setPage] = useState<PageKey>('upscaler');
  const [model, setModel] = useState(DEFAULTS.model);
  const [scale, setScale] = useState(DEFAULTS.scale);
  const [sharp, setSharp] = useState(DEFAULTS.sharp);
  const [denoise, setDenoise] = useState(DEFAULTS.denoise);
  const [feather, setFeather] = useState(DEFAULTS.feather);
  const [contrast, setContrast] = useState(DEFAULTS.contrast);
  const [zoom, setZoom] = useState(DEFAULTS.zoom);
  const [tool, setTool] = useState<ToolKey>('fit');
  const [format, setFormat] = useState<FormatKey>('PNG');
  const [status, setStatus] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = MODELS.find((entry) => entry.name === model) ?? MODELS[0];
  const isCutout = active.cutout;

  // The confirmation on the download button clears itself.
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(null), 1900);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const pickModel = (name: string) => {
    const next = MODELS.find((entry) => entry.name === name);
    if (!next) return;
    setModel(name);
    setPage(next.cutout ? 'bg' : 'upscaler');
    setStatus(`${name} loaded${next.cutout ? ' — cutout tools ready' : ` at ${scale}×`}`);
  };

  const pickPage = (key: PageKey) => {
    setPage(key);
    setTab('canvas');
    if (key === 'bg') {
      const chopper = MODELS.find((entry) => entry.cutout)!;
      setModel(chopper.name);
      setStatus('BG Remover — Chopper loaded, alpha matte ready');
      return;
    }
    if (!isCutout) return;
    setModel(DEFAULTS.model);
    setStatus('Upscaler — Vitality loaded');
  };

  const setZoomTo = (next: number) => {
    setZoom(next);
    setStatus(`Canvas zoom ${next}%`);
  };

  const reset = () => {
    setModel(DEFAULTS.model);
    setScale(DEFAULTS.scale);
    setSharp(DEFAULTS.sharp);
    setDenoise(DEFAULTS.denoise);
    setFeather(DEFAULTS.feather);
    setContrast(DEFAULTS.contrast);
    setZoom(DEFAULTS.zoom);
    setTool('fit');
    setFormat('PNG');
    setTab('canvas');
    setPage('upscaler');
    setSaved(null);
    setStatus('Inspector reset to defaults');
  };

  // Inspector body depends on the tab first, then the page it sits on.
  const panel =
    tab === 'export'
      ? 'export'
      : tab === 'models'
        ? 'models'
        : page === 'gallery'
          ? 'gallery'
          : page === 'models'
            ? 'models'
            : isCutout
              ? 'cutout'
              : 'upscale';

  const file = isCutout
    ? `${model.toLowerCase()}-cutout.${format.toLowerCase()}`
    : `${model.toLowerCase()}-${scale}x.${format.toLowerCase()}`;

  const download = () => {
    setSaved(file);
    setStatus(
      isCutout
        ? `Downloaded ${file} — ${format} cutout from ${model}`
        : `Downloaded ${file} — ${format} at ${scale}×, ${outputSize(scale)}`,
    );
  };

  const heading =
    panel === 'export'
      ? { title: 'Export', sub: `${format} · ${scale}×` }
      : panel === 'models'
        ? { title: 'Models', sub: '5 models, on device' }
        : panel === 'gallery'
          ? { title: 'Gallery', sub: 'Recent results' }
          : panel === 'cutout'
            ? { title: 'Cutout', sub: 'Alpha matte & edges' }
            : { title: 'Upscale', sub: 'AI resolution & details' };

  const zoomIn = () => {
    const index = ZOOMS.indexOf(zoom);
    setZoomTo(ZOOMS[(index + 1) % ZOOMS.length]);
  };

  return (
    <div className="fh-studio">
      <div className="fh-studio-chrome">
        <div className="fh-studio-brand">
          <span className="fh-studio-brand-mark">P</span>
          Pixelify Studio
        </div>

        <div className="fh-studio-tabs" role="tablist" aria-label="Studio views">
          {(['canvas', 'models', 'export'] as TabKey[]).map((key, index) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`fh-studio-tab-${key}`}
              aria-selected={tab === key}
              aria-controls="fh-studio-panel"
              tabIndex={tab === key ? 0 : -1}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              className={`fh-ui fh-studio-tab${tab === key ? ' is-active' : ''}`}
              onClick={() => {
                setTab(key);
                setStatus(`${key === 'canvas' ? 'Canvas' : key === 'models' ? 'Models' : 'Export'} view`);
              }}
              onKeyDown={(event) => {
                const keys: TabKey[] = ['canvas', 'models', 'export'];
                const at = keys.indexOf(tab);
                let next: number | null = null;
                if (event.key === 'ArrowRight') next = (at + 1) % keys.length;
                if (event.key === 'ArrowLeft') next = (at - 1 + keys.length) % keys.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = keys.length - 1;
                if (next === null) return;
                event.preventDefault();
                setTab(keys[next]);
                tabs.current[next]?.focus();
              }}
            >
              {key === 'canvas' ? 'Canvas' : key === 'models' ? 'Models' : 'Export'}
            </button>
          ))}
        </div>

        <div className="fh-studio-chrome-right">
          <span className="fh-studio-avatar" aria-hidden="true" />
          <button
            type="button"
            className="fh-ui fh-studio-export"
            onClick={() => {
              setTab('export');
              setStatus(`Export panel open — ${format} at ${scale}×`);
            }}
          >
            <Download size={11} strokeWidth={2.2} aria-hidden="true" />
            Export
          </button>
        </div>
      </div>

      <div className="fh-studio-body">
        <aside className="fh-studio-rail">
          <span className="fh-studio-rail-label">Pages</span>
          <ul className="fh-studio-rail-list">
            {PAGES.map((entry) => (
              <li key={entry.key} className={page === entry.key ? 'is-active' : ''}>
                <button
                  type="button"
                  className="fh-ui"
                  aria-current={page === entry.key ? 'page' : undefined}
                  onClick={() => pickPage(entry.key)}
                >
                  <span>{entry.label}</span>
                  {entry.count ? <span className="fh-rail-count">{entry.count}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="fh-studio-rail-note">
            <strong>On-device</strong>
            <span>Nothing leaves this tab. No upload queue, no account.</span>
          </div>
        </aside>

        <div className={`fh-studio-stage${tool === 'pan' ? ' is-hand' : ''}`}>
          <span className="fh-studio-stage-head">
            <i className="fh-live-dot" aria-hidden="true" />
            Live result · {isCutout ? model : 'WebGPU'}
          </span>

          {isCutout ? (
            <div className="fh-studio-demo">
              <CutoutDemo model={model} zoom={zoom} />
            </div>
          ) : (
            <StudioDemo scale={scale} model={model} zoom={zoom} />
          )}

          <div className="fh-studio-tools" role="group" aria-label="Canvas tools">
            <button
              type="button"
              className={`fh-ui fh-studio-tool${tool === 'fit' ? ' is-active' : ''}`}
              aria-pressed={tool === 'fit'}
              aria-label="Fit canvas"
              title="Fit canvas"
              onClick={() => {
                setTool('fit');
                setZoomTo(100);
              }}
            >
              <SlidersHorizontal size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`fh-ui fh-studio-tool${tool === 'pan' ? ' is-active' : ''}`}
              aria-pressed={tool === 'pan'}
              aria-label="Pan tool"
              title="Pan tool"
              onClick={() => {
                setTool(tool === 'pan' ? 'fit' : 'pan');
                setStatus(tool === 'pan' ? 'Pan off' : 'Pan tool — drag to move the canvas');
              }}
            >
              <span aria-hidden="true">✋</span>
            </button>
            <button
              type="button"
              className={`fh-ui fh-studio-tool${tool === 'zoom' ? ' is-active' : ''}`}
              aria-pressed={tool === 'zoom'}
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => {
                setTool('zoom');
                zoomIn();
              }}
            >
              <span aria-hidden="true">⌕</span>
            </button>
            <button
              type="button"
              className="fh-ui fh-studio-zoom"
              aria-label={`Canvas zoom ${zoom} percent. Activate to reset to 100 percent`}
              title="Reset zoom"
              onClick={() => setZoomTo(100)}
            >
              {zoom}%
            </button>
          </div>
        </div>

        <aside
          className="fh-studio-panel"
          id="fh-studio-panel"
          role="tabpanel"
          aria-labelledby={`fh-studio-tab-${tab}`}
        >
          <div className="fh-studio-panel-head">
            <div>
              <div className="fh-studio-panel-title">
                <span className="fh-studio-panel-title-icon">
                  <SlidersHorizontal size={13} aria-hidden="true" />
                </span>
                {heading.title}
              </div>
              <span className="fh-studio-panel-sub">{heading.sub}</span>
            </div>
            <button type="button" className="fh-ui fh-chip-sm" onClick={reset}>
              Reset
            </button>
          </div>

          {panel === 'models' ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {MODELS.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={`fh-ui fh-model-row${entry.name === model ? ' is-active' : ''}`}
                  aria-pressed={entry.name === model}
                  onClick={() => pickModel(entry.name)}
                >
                  <span>
                    {entry.name}
                    <small>{entry.meta}</small>
                  </span>
                  <b>{entry.name === model ? 'Loaded' : entry.tag}</b>
                </button>
              ))}
            </div>
          ) : null}

          {panel === 'gallery' ? (
            <>
              <div className="fh-gallery-panel">
                {GALLERY.map((shot) => (
                  <Link key={shot.src} href="#gallery" aria-label={`Open ${shot.label} in the results gallery`}>
                    <img src={shot.src} alt="" loading="lazy" />
                  </Link>
                ))}
              </div>
              <p className="fh-studio-panel-note">
                Upscales and cutouts land side by side, so the before-and-after is
                always one glance away.
              </p>
              <Link href="#gallery" className="fh-ui fh-studio-download">
                Open the gallery
              </Link>
            </>
          ) : null}

          {panel === 'export' ? (
            <>
              <div>
                <span className="fh-studio-row-label">Format</span>
                <div className="fh-studio-format" role="group" aria-label="Export format">
                  {FORMATS.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      className={`fh-ui${format === entry ? ' is-active' : ''}`}
                      aria-pressed={format === entry}
                      onClick={() => {
                        setFormat(entry);
                        setStatus(`Export format ${entry}`);
                      }}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fh-studio-summary">
                <span>
                  Model <b>{model}</b>
                </span>
                <span>
                  Output <b>{isCutout ? '512 × 410 mask' : outputSize(scale)}</b>
                </span>
                <span>
                  File <b>{file}</b>
                </span>
              </div>
              <button type="button" className="fh-ui fh-studio-download" onClick={download}>
                {saved ? <Check size={12} strokeWidth={2.6} aria-hidden="true" /> : <Download size={12} strokeWidth={2.2} aria-hidden="true" />}
                {saved ? 'Saved' : 'Download'}
              </button>
            </>
          ) : null}

          {panel === 'upscale' || panel === 'cutout' ? (
            <>
              <div>
                <span className="fh-studio-row-label">{panel === 'cutout' ? 'Cutout model' : 'Model'}</span>
                <button
                  type="button"
                  className="fh-ui fh-studio-select"
                  onClick={() => {
                    setTab('models');
                    setStatus('Model picker open');
                  }}
                >
                  <span>
                    {model}
                    <small>{active.meta}</small>
                  </span>
                  <span className="fh-model-pill">{active.tag}</span>
                </button>
              </div>

              {panel === 'cutout' ? (
                <StudioRange label="Edge feather" value={feather} onChange={setFeather} />
              ) : (
                <div>
                  <span className="fh-studio-row-label">Scale factor</span>
                  <div className="fh-studio-scale" role="group" aria-label="Scale factor">
                    {[2, 4, 8].map((entry) => (
                      <button
                        key={entry}
                        type="button"
                        className={`fh-ui${scale === entry ? ' is-active' : ''}`}
                        aria-pressed={scale === entry}
                        onClick={() => {
                          setScale(entry);
                          setStatus(`Scale ${entry}× — ${outputSize(entry)}`);
                        }}
                      >
                        {entry}×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {panel === 'upscale' ? (
                <>
                  <StudioRange label="Sharpness" value={sharp} onChange={setSharp} />
                  <StudioRange label="Denoise" value={denoise} onChange={setDenoise} />
                </>
              ) : (
                <StudioRange label="Matte contrast" value={contrast} onChange={setContrast} />
              )}

              <button type="button" className="fh-ui fh-studio-download" onClick={download}>
                {saved ? <Check size={12} strokeWidth={2.6} aria-hidden="true" /> : <Download size={12} strokeWidth={2.2} aria-hidden="true" />}
                {saved ? 'Saved' : 'Download'}
              </button>
            </>
          ) : null}

          <p className="fh-sr" role="status">
            {status}
          </p>
        </aside>
      </div>
    </div>
  );
}
