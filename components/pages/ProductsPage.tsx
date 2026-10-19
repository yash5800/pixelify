import React from 'react';
import type { ViewTab } from '../../types';
import PageShell, { Section, P, UL, Callout } from './PageShell';

interface Props {
  onTabChange: (tab: ViewTab) => void;
}

const TOC = [
  { id: 'lineup', label: 'The lineup' },
  { id: 'upscaler', label: 'AI Image Upscaler' },
  { id: 'bgremove', label: 'Background Remover' },
  { id: 'blog', label: 'Blog & Guides' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'pricing', label: 'Pricing' },
];

const MODELS = [
  {
    key: 'vitality',
    name: 'Vitality',
    size: '1.9 MB',
    speed: '~120 ms',
    best: 'Fast previews, illustrations, anime, portraits',
  },
  {
    key: 'pixel-dance',
    name: 'Pixel-Dance',
    size: '67 MB',
    speed: '~650 ms',
    best: 'Photography, architecture, fine texture, 8K prints',
  },
  {
    key: 'alpha-satoru',
    name: 'Alpha-Satoru',
    size: '65 MB',
    speed: '~450 ms',
    best: 'Portraits, heavy compression artifacts, restoration',
  },
];

export default function ProductsPage({ onTabChange }: Props) {
  return (
    <PageShell
      eyebrow="Products"
      title="Pixelify Products"
      description="Two neural image tools and a publication, everything running locally in your browser,
      free, with no account and no watermark."
      updated="Last updated: October 12, 2026"
      toc={TOC}
      documentTitle="Pixelify Products: Upscaler, Background Remover & Guides"
      metaDescription="The full Pixelify lineup: AI Image Upscaler (Vitality, Pixel-Dance,
      Alpha-Satoru), Background Remover (Chopper), and the Blog & Guides: specs, formats and requirements."
      onTabChange={onTabChange}
    >
      <Section id="lineup" num={1} title="The lineup">
        <P>
          Pixelify is one site with three surfaces. The two tools share the same rules: your images
          never leave your device, output is never watermarked, and there is no account to create.
        </P>
        <UL
          items={[
            <>
              <strong>AI Image Upscaler:</strong> 2× / 4× / 8× super-resolution with three neural
              models and per-image enhancement controls.
            </>,
            <>
              <strong>Background Remover:</strong> automatic subject segmentation with a
              full canvas editor on top.
            </>,
            <>
              <strong>Blog &amp; Guides:</strong> deep-dives on the models, the privacy story and
              the practical limits of local AI.
            </>,
          ]}
        />
      </Section>

      <Section id="upscaler" num={2} title="AI Image Upscaler">
        <P>
          Drop in a PNG, JPEG or WebP up to 15 MB and choose how far to push it. Upscaling is
          tiled, so large images are processed in chunks that fit your GPU memory, and each pass
          is cancellable mid-run. The result is post-processed through optional enhancement passes
          and exported losslessly.
        </P>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 font-mono text-[11px] uppercase tracking-wider text-white/40">
                <th className="py-3 pr-4 font-bold">Model</th>
                <th className="py-3 pr-4 font-bold">Download</th>
                <th className="py-3 pr-4 font-bold">Per image</th>
                <th className="py-3 font-bold">Best for</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.key} className="border-b border-white/5 align-top">
                  <td className="py-3.5 pr-4 font-semibold text-white">{m.name}</td>
                  <td className="py-3.5 pr-4 font-mono text-[13px] text-muted">{m.size}</td>
                  <td className="py-3.5 pr-4 font-mono text-[13px] text-muted">{m.speed}</td>
                  <td className="py-3.5 text-[14px] text-muted">{m.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          <em>Times are typical for a mid-range desktop GPU; the small model is so light it runs
          comfortably even on WASM-only devices.</em>
        </P>
        <UL
          items={[
            'Scales: 2×, 4× and 8× (8× is a two-pass pipeline).',
            'Presets per model (Standard, Fast, Crisp, Illustration, Photography, Landscape, Portrait, Artwork), each mapping to concrete denoise / sharpen / colour / HDR values.',
            'Per-image controls: face restoration, noise removal, sharpening, colour enhancement, HDR boost, brightness and contrast.',
            'Input: PNG, JPEG, WebP up to 15 MB. Output: PNG, WebP or JPEG, no watermark, up to 16,384 × 16,384 px.',
            'Runs batch-style: queue several images, each processing independently in the background, with progress, cancel and completion chime per image.',
          ]}
        />
        <Callout title="Try it">
          <p>
            Open the <a href="/upscaler">AI Image Upscaler</a>. No sign-up; the engine badge shows
            whether you are on WebGPU or WASM in real time.
          </p>
        </Callout>
      </Section>

      <Section id="bgremove" num={3} title="Background Remover">
        <P>
          The remover uses the Chopper neural segmentation model, an architecture
          trained specifically to hold on to hair, fur, glass and other semi-transparent edges that
          colour-key tools destroy. It runs in a background Web Worker, so the page stays
          responsive while the model loads and segments.
        </P>
        <UL
          items={[
            'One-click automatic cutout; no masks or green screen.',
            'Canvas editor on top: erase/restore brushes, crop, zoom lens, and a full undo/redo history.',
            'Replace backgrounds with transparent, solid colour, gradient presets, or your own photo, plus drop shadows, outlines and brightness/contrast/saturation adjustments.',
            'Input: PNG, JPEG, WebP up to 15 MB (drag, paste or picker). Output: transparent PNG, WebP with alpha, or JPG on a solid background.',
            'Hair- and fur-level precision is the default, not a premium tier.',
          ]}
        />
        <Callout title="Try it">
          <p>
            Open the <a href="/bg_remove">Background Remover</a>. The first image downloads the
            model (~40 MB) once; every image after that is fast.
          </p>
        </Callout>
      </Section>

      <Section id="blog" num={4} title="Blog & Guides">
        <P>
          The <a href="/blogs">blog</a> is where we write at length: how the models work, what
          super-resolution actually reconstructs versus invents, how WebGPU differs from WASM on
          this hardware, and how a site with no backend handles privacy. Articles are published in
          English, French, Chinese, Japanese, Hindi and Russian, with read-time estimates and
          tag-based search.
        </P>
      </Section>

      <Section id="requirements" num={5} title="Requirements">
        <UL
          items={[
            'Any modern browser. WebGPU (Chrome/Edge 113+, Safari 17+ over HTTPS) gives full speed; everything else falls back to WebAssembly automatically.',
            'Firefox works via WASM. It is functional, but expect slower large-image runs.',
            'Mobile browsers are supported; WebAssembly is used there deliberately, because mobile WebGPU memory limits can crash the tab on large models.',
            'A desktop-class GPU and 8 GB+ RAM is recommended for 8× runs on large images; output is capped at 16,384 px per side regardless of hardware.',
            'First visit downloads the model you pick (1.9MB to 67MB, or about 40MB for the remover). Your browser caches it, so subsequent visits start instantly.',
          ]}
        />
      </Section>

      <Section id="pricing" num={6} title="Pricing">
        <Callout title="Free, genuinely">
          <p>
            Both tools are free with unlimited use: no credits, no subscription, no trial timer,
            no watermark, no account. There is nothing to upgrade to, because the compute is yours.
          </p>
        </Callout>
        <P>
          If the site ever changes that model, the <a href="/terms">Terms of Service</a> will be
          updated before any paid feature takes effect, and this page will say so plainly.
        </P>
      </Section>
    </PageShell>
  );
}
