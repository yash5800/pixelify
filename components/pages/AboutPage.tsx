import React from 'react';
import type { ViewTab } from '../../types';
import PageShell, { Section, P, UL, Callout } from './PageShell';

interface Props {
  onTabChange: (tab: ViewTab) => void;
}

const TOC = [
  { id: 'why', label: 'Why Pixelify exists' },
  { id: 'what', label: 'What it does' },
  { id: 'how', label: 'How it works' },
  { id: 'privacy', label: 'Our privacy stance' },
  { id: 'honest', label: 'Being honest about AI' },
  { id: 'who', label: 'Who it is for' },
  { id: 'contact', label: 'Contact' },
];

export default function AboutPage({ onTabChange }: Props) {
  return (
    <PageShell
      eyebrow="About"
      title="About Pixelify"
      description="Pixelify is a browser-based AI image studio: super-resolution upscaling and neural background
      removal that run entirely on your own device. No uploads, no accounts, no watermarks."
      updated="Last updated: October 12, 2026"
      toc={TOC}
      documentTitle="About Pixelify: Local AI Image Studio"
      metaDescription="Pixelify runs AI image upscaling and background removal entirely in your browser with
      WebGPU and WebAssembly. No uploads, no accounts, no tracking, and we explain exactly how."
      onTabChange={onTabChange}
    >
      <Section id="why" num={1} title="Why Pixelify exists">
        <P>
          Most online image tools work the same way: you hand your photo to a server, wait for
          someone else's GPU to process it, and hope the fine print is acceptable. That model has
          three costs. A privacy cost, because private photos leave your device. A latency and
          friction cost, because uploads are slow and queues get long. And a pricing cost, because
          somebody has to pay for all that compute, usually you, per credit.
        </P>
        <P>
          The last few years removed the reason for that trade-off. Super-resolution and segmentation
          models got small enough, and browsers got fast enough, that the same class of network that
          used to need a data-center GPU now runs in a normal laptop tab. Pixelify exists to ship
          that: the tools, in your browser, with the server removed from the equation entirely.
        </P>
      </Section>

      <Section id="what" num={2} title="What it does">
        <P>Pixelify currently ships two tools and a publication:</P>
        <UL
          items={[
            <>
              <strong>AI Image Upscaler:</strong> enlarge images 2×, 4× or 8× with three neural
              models (Vitality, Pixel-Dance, Alpha-Satoru), presets for portraits, art and
              landscapes, and optional denoise, sharpen, face restoration, colour and HDR passes.
              Export as PNG, WebP or JPEG.
            </>,
            <>
              <strong>Background Remover:</strong> one-click neural cutouts using the Chopper
              segmentation model, with hair- and fur-level edge precision, erase/restore brushes,
              background replacement, and transparent PNG or WebP export.
            </>,
            <>
              <strong>Blog &amp; Guides:</strong> long-form articles on local AI, privacy, and
              how the models in this site actually work, published in several languages.
            </>,
          ]}
        />
        <P>
          Both tools are free to use, with no credits, no daily caps and no watermark on the output.
          See the <a href="/products">products page</a> for full specifications.
        </P>
      </Section>

      <Section id="how" num={3} title="How it works">
        <P>
          Pixelify is a static web application. There is no Pixelify backend: no API you call, no
          queue your job joins, no database holding your images. When you open the page, your
          browser downloads the application code and the neural model files (once; they are then
          cached by your browser). Inference runs on your own hardware:
        </P>
        <UL
          items={[
            <>
              <strong>WebGPU</strong> is used when your browser exposes it (Chrome, Edge, and Safari
              17+ over HTTPS). Models execute directly on your GPU.
            </>,
            <>
              <strong>WebAssembly (WASM SIMD)</strong> is the automatic fallback everywhere else,
              including Firefox and on mobile, where it keeps things slow-but-stable.
            </>,
            <>
              The background remover runs inside a <strong>Web Worker</strong>, so model download
              and segmentation never freeze the interface.
            </>,
          ]}
        />
        <P>
          Your image is read from disk into memory, processed as pixel tensors on your GPU or CPU,
          and handed back as a canvas you can preview and download. At no point does it become a
          network payload.
        </P>
      </Section>

      <Section id="privacy" num={4} title="Our privacy stance">
        <P>
          Privacy here is a property of the architecture, not a promise in a policy. We cannot
          leak, sell, or lose image data we never receive. There are no accounts, no analytics
          scripts, no advertising pixels, and no first-party cookies on this site. The only things
          we store are your theme and sound preferences, in your own browser's local storage;
          clear your site data and they are gone. The site is supported by Google AdSense ads on
          content pages. AdSense sets its own cookies (Google's cookies, not ours), and the ad
          code never touches the AI tools: your images are still never uploaded anywhere.
        </P>
        <P>
          For completeness: your browser does make a few ordinary requests to load the site: the
          application itself, the model files, fonts, and the open-source libraries that power
          inference. None of those requests contain your images. The full breakdown is in our
          <a href="/privacy"> Privacy Policy</a>, written to be checkable against the code rather
          than taken on faith.
        </P>
      </Section>

      <Section id="honest" num={5} title="Being honest about AI">
        <P>
          Super-resolution models do not recover detail that was never captured; they reconstruct
          plausible detail. On faces, textures and artwork this lands very close to truth. On fine
          text, dense patterns and small logos it can invent plausible-but-wrong shapes. Background
          removal can occasionally clip a stray strand of hair or misread a transparent object.
        </P>
        <P>
          We think tools are better when they say this out loud. Every result is a reconstruction,
          so check the before/after at 100% before you rely on an output for print or publication,
          and treat restored faces and reconstructed documents accordingly. Our blog goes deeper on
          where each model is reliable and where it drifts.
        </P>
      </Section>

      <Section id="who" num={6} title="Who it is for">
        <P>
          Anyone who has hesitated before uploading a photo to an editing site. Photographers
          cleaning up client shots under NDA. Sellers who batch-process product listings. People
          restoring old family photos they would rather not share with a stranger's server.
          Developers and designers who want a fast local workflow. If your images are ordinary,
          Pixelify is simply the faster option; if your images are sensitive, it is the only one of
          the two that is safe by construction.
        </P>
      </Section>

      <Section id="contact" num={7} title="Contact">
        <P>
          Pixelify is run by a small team and lives on GitHub. The most reliable way to reach us,
          whether for bugs, privacy questions or data requests, is to open an issue:
        </P>
        <Callout title="Get in touch">
          <p>
            <a href="https://github.com/yash5800/pixelify" target="_blank" rel="noreferrer">
              github.com/yash5800/pixelify
            </a>
            {'. '}
            Open an issue for bug reports, feature requests, or anything privacy-related. We read
            every one.
          </p>
        </Callout>
        <P>
          You can also start with the <a href="/products">products overview</a>, read the
          <a href="/privacy"> Privacy Policy</a> and <a href="/terms"> Terms of Service</a>, or jump
          straight into the <a href="/blogs">blog</a>.
        </P>
      </Section>
    </PageShell>
  );
}
