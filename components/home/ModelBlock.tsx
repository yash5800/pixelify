'use client';

import { useState } from 'react';
import { StudioRange } from './StudioRange';

/**
 * The model index card: pick a row and the inspector follows it, with live
 * scale and refinement values instead of printed ones.
 */

const MODELS = [
  {
    name: 'Vitality',
    size: '1.9 MB',
    scale: '2× / 4× / 8×',
    best: 'Fastest, crisp clean edges',
    badge: 'Popular',
    glyph: 'V',
    cutout: false,
  },
  {
    name: 'Pixel-Dance',
    size: '66.9 MB',
    scale: '2× / 4× / 8×',
    best: 'Max detail, up to 8K output',
    glyph: 'PD',
    cutout: false,
  },
  {
    name: 'Alpha-Satoru',
    size: '67.1 MB',
    scale: '2× / 4× / 8×',
    best: 'Natural detail for portraits',
    glyph: 'AS',
    cutout: false,
  },
  {
    name: 'Chopper',
    size: '40 MB',
    scale: 'Cutout',
    best: 'Fast subject segmentation',
    glyph: 'C',
    cutout: true,
  },
  {
    name: 'Diablo',
    size: 'On demand',
    scale: 'Cutout',
    best: 'Studio-grade edge matting',
    glyph: 'D',
    cutout: true,
  },
];

export function ModelBlock() {
  const [loaded, setLoaded] = useState('Vitality');
  const [scale, setScale] = useState(4);
  const [sharp, setSharp] = useState(50);
  const [denoise, setDenoise] = useState(50);
  const [face, setFace] = useState(50);
  const [status, setStatus] = useState('');

  const model = MODELS.find((entry) => entry.name === loaded) ?? MODELS[0];

  return (
    <div className="fh-work-card">
      <div className="fh-shotbar">
        <span className="fh-shotbar-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="fh-shotbar-title">Studio · models</span>
        <span className="fh-shotbar-tag">5 available · on-device</span>
      </div>
      <div className="fh-work-stage">
        <div className="fh-model-table">
          <div className="fh-model-table-head">
            <div>
              <h3>Pick the model for the frame</h3>
              <p>Three upscalers, two cutout models — switch without re-uploading.</p>
            </div>
            <span className="fh-model-pill">{loaded} loaded</span>
          </div>
          <table className="fh-model-grid">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Size</th>
                <th scope="col">Scale</th>
                <th scope="col">Best for</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((entry) => (
                <tr
                  key={entry.name}
                  className={entry.name === loaded ? 'is-selected' : ''}
                  onClick={() => {
                    setLoaded(entry.name);
                    setStatus(`${entry.name} loaded — ${entry.cutout ? 'cutout tools' : `${scale}× upscale`}`);
                  }}
                >
                  <td>
                    <button
                      type="button"
                      className="fh-ui fh-model-name"
                      aria-pressed={entry.name === loaded}
                      onClick={(event) => {
                        event.stopPropagation();
                        setLoaded(entry.name);
                        setStatus(`${entry.name} loaded — ${entry.cutout ? 'cutout tools' : `${scale}× upscale`}`);
                      }}
                    >
                      <span className="fh-model-glyph" aria-hidden="true">
                        {entry.glyph}
                      </span>
                      {entry.name}
                    </button>
                  </td>
                  <td>{entry.size}</td>
                  <td>{entry.scale}</td>
                  <td>
                    <span className="fh-model-name">
                      {entry.best}
                      {entry.badge ? <span className="fh-model-pill">{entry.badge}</span> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="fh-work-panel">
          <span className="fh-work-panel-title">Upscale</span>
          {model.cutout ? (
            <p className="fh-studio-panel-note" style={{ color: '#9a9a9a' }}>
              {model.name} outputs the mask at source resolution — pick an upscaler
              to choose a scale factor.
            </p>
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
                      setStatus(`Scale ${entry}×`);
                    }}
                  >
                    {entry}×
                  </button>
                ))}
              </div>
            </div>
          )}
          <StudioRange label="Sharpness" value={sharp} onChange={setSharp} />
          <StudioRange label="Denoise" value={denoise} onChange={setDenoise} />
          <StudioRange label="Face enhancement" value={face} onChange={setFace} />
          <span className="fh-chip-sm is-green">
            {model.cutout ? 'Cutout only · no scale' : 'WebGPU accelerated'}
          </span>
          <p className="fh-sr" role="status">
            {status}
          </p>
        </aside>
      </div>
    </div>
  );
}
