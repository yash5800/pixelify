'use client';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, ArrowUpRight, Check, ChevronRight, Download, FileImage, ImagePlus, LockKeyhole, MousePointer2, Pause, Play, ScanLine, Sparkles, WandSparkles } from 'lucide-react';

type Flow = 'upscale' | 'background' | 'anime' | 'product';
const FLOWS: { id: Flow; name: string; detail: string; color: string; icon: React.ElementType }[] = [
  { id: 'upscale', name: 'Photo Upscale', detail: 'Recover photo detail', color: '#00ef8b', icon: WandSparkles },
  { id: 'background', name: 'Portrait Cutout', detail: 'Remove a background', color: '#63dff4', icon: ScanLine },
  { id: 'anime', name: 'Anime Upscale', detail: 'Sharpen drawn lines', color: '#bd9aff', icon: Sparkles },
  { id: 'product', name: 'Product Cutout', detail: 'Clean e-commerce edges', color: '#ffc16b', icon: ScanLine },
];
const STEPS = ['Upload', 'Set up', 'Process', 'Review', 'Download'];
const CURSOR = [{ left: '48%', top: '71%' }, { left: '73%', top: '68%' }, { left: '77%', top: '70%' }, { left: '77%', top: '77%' }, { left: '55%', top: '78%' }];
const NARRATION: Record<Flow, string[]> = {
  upscale: ['Choose a small or soft photo to bring more detail back.', 'Select an enlargement factor for your image.', 'Pixelify rebuilds fine texture locally in your browser.', 'Review the preview and check the new dimensions.', 'Download the finished preview to your device.'],
  background: ['Choose a portrait where you want the subject separated.', 'Adjust edge feathering for a softer cutout.', 'Pixelify creates a foreground mask and refines fine edges.', 'Inspect the transparent result against the checkerboard.', 'Download the cutout preview as an image.'],
  anime: ['Start with a compressed anime frame or illustration.', 'Choose an enlargement factor while keeping line art crisp.', 'Pixelify rebuilds edges and color blocks for a cleaner illustration.', 'Check faces, outlines, and fine details in the preview.', 'Download the enlarged illustration preview.'],
  product: ['Choose a product photo for a clean storefront image.', 'Set the product edge option and feather the outline if needed.', 'Pixelify separates the product silhouette from its background.', 'Review the outline and transparent cutout before saving.', 'Download the product cutout preview.'],
};
const isUpscaler = (flow: Flow) => flow === 'upscale' || flow === 'anime';
const fileFor = (flow: Flow) => flow === 'upscale' ? 'summer-campaign.jpg' : flow === 'background' ? 'portrait-photo.jpg' : flow === 'anime' ? 'anime-frame.jpg' : 'product-shot.jpg';

export default function HomeWorkflowDemos({ onLaunchUpscaler, onLaunchBGRemove }: { onLaunchUpscaler: () => void; onLaunchBGRemove: () => void }) {
  const [flow, setFlow] = useState<Flow>('upscale');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const [scale, setScale] = useState('4×');
  const [feather, setFeather] = useState(true);
  const reducedMotion = useReducedMotion();
  const config = FLOWS.find((item) => item.id === flow)!;

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = window.setTimeout(() => { setStep((n) => (n + 1) % 5); if (step === 4) setDownloaded(false); }, step === 2 ? 3300 : 2500);
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion, step, flow]);
  useEffect(() => {
    if (!playing || reducedMotion || step !== 4) return;
    const timer = window.setTimeout(() => setDownloaded(true), 1000);
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion, step, flow]);

  const goTo = (next: number) => { setStep(next); setDownloaded(false); };
  const choose = (next: Flow) => { setFlow(next); setStep(0); setDownloaded(false); setPlaying(true); };
  const openTool = () => isUpscaler(flow) ? onLaunchUpscaler() : onLaunchBGRemove();
  const downloadDemo = () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 960"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#101714"/><stop offset="1" stop-color="#28382e"/></linearGradient></defs><rect width="1280" height="960" fill="url(#g)"/><circle cx="830" cy="330" r="220" fill="' + config.color + '"/><path d="M0 730Q260 590 560 730T1280 675V960H0Z" fill="#253a2d"/><text x="64" y="882" fill="#e7f3e9" font-family="sans-serif" font-size="30">Pixelify guided demo · ' + config.name + '</text></svg>';
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pixelify-' + flow + '-demo.svg'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true);
  };
  const title = step === 0 ? 'Add an image to begin' : step === 1 ? 'Set up ' + config.name : step === 2 ? flow === 'background' ? 'Building a clean subject mask' : flow === 'product' ? 'Tracing the product edge' : flow === 'anime' ? 'Rebuilding illustrated linework' : 'Recovering photo detail' : step === 3 ? 'Preview result' : downloaded ? 'Demo download complete' : 'Download your result';

  return <section className="wf-section" aria-label="Interactive workflow demos" style={{ '--wf-accent': config.color } as React.CSSProperties}>
    <div className="wf-window">
      <header className="wf-titlebar"><div className="wf-dots"><i /><i /><i /></div><span>PIXELIFY STUDIO <small>LIVE WORKFLOW DEMOS</small></span><span className="wf-private"><LockKeyhole size={11} /> ON DEVICE</span></header>
      <nav className="wf-flow-picker" aria-label="Choose a workflow demo">{FLOWS.map(({ id, name, icon: Icon }) => <button type="button" key={id} className={flow === id ? 'active' : ''} aria-pressed={flow === id} onClick={() => choose(id)}><Icon size={14} /><span>{name}</span></button>)}</nav>
      <div className="wf-timeline"><span className="wf-live"><i /> GUIDED WORKFLOW</span><div className="wf-steps">{STEPS.map((name, i) => <button type="button" key={name} className={step === i ? 'current' : step > i ? 'done' : ''} onClick={() => goTo(i)} aria-current={step === i ? 'step' : undefined}><i>{step > i ? <Check size={11} /> : '0' + (i + 1)}</i><span>{name}</span></button>)}</div><button type="button" className="wf-play" onClick={() => reducedMotion ? goTo((step + 1) % 5) : setPlaying((x) => !x)}>{reducedMotion ? <ChevronRight size={13} /> : playing ? <Pause size={13} /> : <Play size={13} />}{reducedMotion ? 'Next' : playing ? 'Pause' : 'Play'}</button></div>
      <AnimatePresence mode="wait"><motion.div className="wf-narration" key={flow + '-caption-' + step} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}><span>STEP 0{step + 1} · {STEPS[step].toUpperCase()}</span><p>{NARRATION[flow][step]}</p></motion.div></AnimatePresence>
      <div className="wf-appbar"><span className="wf-brand"><i><Sparkles size={13} /></i><b>pixelify</b></span><div className="wf-tabs"><button className={step === 0 ? 'active' : ''} onClick={() => goTo(0)}>Upload</button><button className={step === 1 || step === 2 ? 'active' : ''} onClick={() => goTo(1)}>Edit</button><button className={step >= 3 ? 'active' : ''} onClick={() => goTo(3)}>Export</button></div><span className="wf-session"><LockKeyhole size={11} /> Private session</span></div>
      <div className="wf-layout">
        <aside className="wf-sidebar"><span className="wf-label">AI TOOLS</span>{FLOWS.map(({ id, name, detail, icon: Icon }) => <button type="button" key={id} className={'wf-tool ' + (flow === id ? 'selected' : '')} onClick={() => choose(id)} aria-pressed={flow === id}><Icon size={14} /><span><b>{name}</b><small>{detail}</small></span>{flow === id && <Check size={12} />}</button>)}<div className="wf-file"><span className="wf-label">CURRENT FILE</span><div><FileImage size={14} /><span><b>{fileFor(flow)}</b><small>2.4 MB · JPG</small></span></div></div><span className="wf-privacy"><LockKeyhole size={11} /> Processed on your device</span></aside>
        <main className="wf-main">
          <div className="wf-heading"><div><span>WORKSPACE <ChevronRight size={10} /> {config.name.toUpperCase()}</span><h3>{title}</h3></div><i>{step === 2 ? 'PROCESSING' : step === 4 && !downloaded ? 'READY TO SAVE' : step >= 3 ? 'COMPLETE' : 'READY'}</i></div>
          <div className={'wf-canvas flow-' + flow}><div className="wf-cursor-layer" aria-hidden="true"><motion.div className="wf-cursor" animate={CURSOR[step]} transition={{ duration: .44, ease: [.2, .8, .2, 1] }}><motion.i key={flow + step} initial={{ scale: .35, opacity: .8 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ delay: .41, duration: .32 }} /><MousePointer2 size={24} fill="white" strokeWidth={1.5} /></motion.div></div>
            <AnimatePresence mode="wait"><motion.div key={flow + step} className="wf-stage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .24 }}>
              {step === 0 && <div className="wf-upload"><span><ImagePlus size={21} /></span><b>Drop an image here</b><small>or choose a file from your device</small><button type="button" onClick={() => goTo(1)}>Choose image <ArrowUpRight size={12} /></button><i>JPG, PNG or WebP · up to 20 MB</i></div>}
              {step === 1 && <Setup flow={flow} next={() => goTo(2)} scale={scale} setScale={setScale} feather={feather} setFeather={setFeather} />}
              {step === 2 && <div className={'wf-processing proc-' + flow}><Artwork flow={flow} /><div><span className="wf-kicker"><Sparkles size={11} /> PIXELIFY AI</span><b>{flow === 'background' ? 'Building a clean subject mask' : flow === 'product' ? 'Tracing product edges' : flow === 'anime' ? 'Rebuilding illustrated lines' : 'Recovering photo detail'}</b><small>Working locally in your browser</small><div className="wf-progress"><motion.i initial={{ width: '5%' }} animate={{ width: '94%' }} transition={{ duration: 3, ease: 'easeInOut' }} /></div><small>{flow === 'background' ? 'Refining hair and edge detail…' : flow === 'product' ? 'Smoothing the product outline…' : flow === 'anime' ? 'Sharpening linework and color blocks…' : 'Analyzing image tiles…'}</small></div></div>}
              {step === 3 && <div className={'wf-result result-' + flow}><Artwork flow={flow} /><div><span className="wf-kicker"><Check size={11} /> PREVIEW RESULT</span><b>{flow === 'anime' ? 'Anime detail preview' : flow === 'product' ? 'Product cutout preview' : config.name + ' result preview'}</b><small>{flow === 'upscale' ? 'Sharper details · ' + scale + ' resolution' : flow === 'anime' ? 'Crisp linework · ' + scale + ' enlargement' : flow === 'background' ? 'Clean portrait edges · transparent cutout' : 'Product outline · transparent cutout'}</small><span className="wf-badges"><i>LOCAL</i><i>PREVIEW</i><i>READY</i></span><button type="button" onClick={() => goTo(4)}>Continue to download <ArrowDownToLine size={12} /></button></div></div>}
              {step === 4 && <div className="wf-download"><span><Check size={20} /></span><b>{downloaded ? 'Download complete' : 'Ready to download'}</b><small>pixelify-{flow}-demo.svg</small><i>Guided demo preview file</i><button type="button" onClick={downloadDemo}><Download size={13} />{downloaded ? 'Download again' : 'Download result'}</button></div>}
            </motion.div></AnimatePresence>
          </div>
          <div className="wf-footer"><span><LockKeyhole size={11} /> Your files never leave your device</span>{step < 3 ? <button type="button" onClick={openTool}>Open {isUpscaler(flow) ? 'AI Upscaler' : 'BG Remover'} <ArrowUpRight size={12} /></button> : step === 3 ? <span className="wf-note">Guided demo output</span> : <button type="button" onClick={openTool}>Open the real tool <ArrowUpRight size={12} /></button>}</div>
        </main>
      </div>
    </div>
  </section>;
}

function Artwork({ flow }: { flow: Flow }) { return <div className={'wf-art art-' + flow}><span /><i /><b /></div>; }

function Setup({ flow, next, scale, setScale, feather, setFeather }: { flow: Flow; next: () => void; scale: string; setScale: (value: string) => void; feather: boolean; setFeather: (value: boolean) => void }) {
  if (flow === 'upscale' || flow === 'anime') return <div className="wf-setup"><Artwork flow={flow} /><div className="wf-copy"><span className="wf-kicker"><Check size={11} /> IMAGE ADDED</span><b>{fileFor(flow)}</b><small>{flow === 'anime' ? 'Illustration · 720 × 480 px' : '1280 × 960 px · JPG'}</small><div className="wf-options">{['2×', '4×', '8×'].map((value) => <button type="button" className={scale === value ? 'selected' : ''} onClick={() => setScale(value)} key={value}>{value}</button>)}</div><button type="button" className="wf-action" onClick={next}>{flow === 'anime' ? 'Upscale illustration' : 'Enhance image'} <ArrowUpRight size={12} /></button></div></div>;
  const product = flow === 'product';
  return <div className="wf-setup"><div className="wf-mask"><Artwork flow={flow} /><i /></div><div className="wf-copy"><span className="wf-kicker"><Check size={11} /> {product ? 'PRODUCT FOUND' : 'SUBJECT FOUND'}</span><b>{fileFor(flow)}</b><small>{product ? 'Object detected · edge detail high' : 'Person detected · edge detail high'}</small><div className="wf-options"><button type="button" className="selected">{product ? 'Product edge' : 'Hair detail'}</button><button type="button" className={feather ? 'selected' : ''} onClick={() => setFeather(!feather)}>Feather edge</button></div><button type="button" className="wf-action" onClick={next}>{product ? 'Cut out product' : 'Remove background'} <ArrowUpRight size={12} /></button></div></div>;
}
