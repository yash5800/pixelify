import Link from 'next/link';
import { ArrowRight, Scissors } from 'lucide-react';
import { Reveal } from './Reveal';
import { ImageWheel } from './ImageWheel';
import { CutoutBlock } from './CutoutBlock';
import { ModelBlock } from './ModelBlock';
import { ToolTabsDemo } from './ToolTabsDemo';

/** Framer's "build together with agents" band, rebuilt as the Pixelify workflow. */
export function WorkflowSection() {
  return (
    <section className="fh-section fh-workflow" id="workflow">
      <div className="fh-container">
        <div className="fh-workflow-header">
          <Reveal>
            <p className="fh-eyebrow">The canvas</p>
            <h2 className="fh-h2">One canvas. Every step.</h2>
            <p className="fh-lede">
              Cut out, refine and upscale without bouncing between tabs — every
              change stays visible while you work.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <Link href="/upscaler/" className="fh-pill fh-pill-secondary">
              Open the studio
            </Link>
          </Reveal>
        </div>

        <div className="fh-workflow-stack">
          {/* Cutout block */}
          <Reveal y={30} className="fh-work-block">
            <CutoutBlock />
            <div className="fh-work-meta">
              <div>
                <h3>Cut out on the canvas</h3>
                <p>
                  Chopper finds the subject and refines hair, fur and soft edges —
                  then you brush in the last 2%.
                </p>
              </div>
              <div className="fh-work-meta-side">
                <p>
                  Erase and restore strokes, swap the backdrop, add a drop shadow,
                  or drop the cutout onto a custom scene. The alpha mask is rebuilt
                  without a single request leaving the machine.
                </p>
                <Link href="/bg_remove/" className="fh-text-link">
                  Remove a background
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Models block */}
          <Reveal y={30} className="fh-work-block">
            <ModelBlock />
            <div className="fh-work-meta">
              <div>
                <h3>Match the model to the image</h3>
                <p>
                  Vitality is instant. Pixel-Dance pulls out maximum detail.
                  Alpha-Satoru keeps portraits looking natural.
                </p>
              </div>
              <div className="fh-work-meta-side">
                <p>
                  Every model runs locally through WebGPU, with a WASM fallback for
                  older browsers. Tiled inference keeps large files inside memory
                  while it resolves the frame.
                </p>
                <Link href="/products/" className="fh-text-link">
                  Compare the models
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Tools block */}
          <Reveal y={30} className="fh-work-block">
            <div className="fh-work-card">
              <div className="fh-shotbar">
                <span className="fh-shotbar-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="fh-shotbar-title">BG Remover · tools</span>
                <span className="fh-shotbar-tag">4 tabs · one mask</span>
              </div>
              <ToolTabsDemo />
            </div>
            <div className="fh-work-meta">
              <div>
                <h3>Four tools after the cutout</h3>
                <p>
                  Every tab edits the same alpha matte — switch between them without
                  re-running the model.
                </p>
              </div>
              <div className="fh-work-meta-side">
                <p>
                  Swap the backdrop, add a drop shadow or edge stroke, crop to a
                  ratio and set a headline. The cutout carries across every tab and
                  exports as one file, in the format you pick.
                </p>
                <Link href="/bg_remove/" className="fh-text-link">
                  Try the tools
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Results wheel block */}
          <Reveal y={30} className="fh-work-block">
            <div className="fh-work-card">
              <div className="fh-shotbar">
                <span className="fh-shotbar-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="fh-shotbar-title">Results · studio gallery</span>
                <span className="fh-shotbar-tag">
                  <Scissors size={10} aria-hidden="true" /> 5 tools
                </span>
              </div>
              <ImageWheel />
            </div>
            <div className="fh-work-meta">
              <div>
                <h3>Keep every result in view</h3>
                <p>
                  Upscales and cutouts land side by side, so the before-and-after is
                  always one glance away.
                </p>
              </div>
              <div className="fh-work-meta-side">
                <p>
                  Zoom, pan and compare on a live slider. Re-run at a different
                  scale, or take the result into Backdrop, Effects, Crop and Design
                  without starting over.
                </p>
                <Link href="#gallery" className="fh-text-link">
                  Browse the results
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
