import type { EnhancementOptions, ModelConfig, ModelKey, BackgroundPrompt } from '../types';

/* ==========================================================================
   REAL PRESET CONFIGURATIONS
   Each model's presets map to concrete enhancement values that are applied
   by the canvas post-processing pipeline (applyCanvasEnhancements).
   Levels are 0–100 where 50 is the neutral baseline.
   ========================================================================== */

export interface PresetSettings
  extends Pick<
    EnhancementOptions,
    | 'sharpness'
    | 'denoise'
    | 'brightness'
    | 'contrast'
  > {
  faceEnhancement?: number;
  colorLevel?: number;
  hdrLevel?: number;
}

export const PRESET_SETTINGS: Record<ModelKey, Record<string, PresetSettings>> = {
  vitality: {
    Standard: {
      sharpness: 50,
      denoise: 50,
      faceEnhancement: 50,
      colorLevel: 50,
      hdrLevel: 50,
      brightness: 50,
      contrast: 50,
    },
    Fast: {
      sharpness: 62,
      denoise: 42,
      faceEnhancement: 50,
      colorLevel: 50,
      hdrLevel: 50,
      brightness: 50,
      contrast: 55,
    },
    Crisp: {
      sharpness: 78,
      denoise: 30,
      faceEnhancement: 50,
      colorLevel: 55,
      hdrLevel: 55,
      brightness: 52,
      contrast: 62,
    },
    Illustration: {
      sharpness: 72,
      denoise: 68,
      faceEnhancement: 50,
      colorLevel: 68,
      hdrLevel: 52,
      brightness: 54,
      contrast: 58,
    },
  },
  'pixel-dance': {
    Balanced: {
      sharpness: 50,
      denoise: 50,
      faceEnhancement: 50,
      colorLevel: 50,
      hdrLevel: 50,
      brightness: 50,
      contrast: 50,
    },
    PixelDance: {
      sharpness: 88,
      denoise: 35,
      faceEnhancement: 50,
      colorLevel: 55,
      hdrLevel: 58,
      brightness: 52,
      contrast: 66,
    },
    Photography: {
      sharpness: 66,
      denoise: 45,
      faceEnhancement: 58,
      colorLevel: 62,
      hdrLevel: 62,
      brightness: 52,
      contrast: 56,
    },
    Landscape: {
      sharpness: 74,
      denoise: 40,
      faceEnhancement: 50,
      colorLevel: 72,
      hdrLevel: 70,
      brightness: 50,
      contrast: 60,
    },
  },
  'alpha-satoru': {
    Balanced: {
      sharpness: 50,
      denoise: 50,
      faceEnhancement: 50,
      colorLevel: 50,
      hdrLevel: 50,
      brightness: 50,
      contrast: 50,
    },
    Portrait: {
      sharpness: 55,
      denoise: 66,
      faceEnhancement: 82,
      colorLevel: 58,
      hdrLevel: 52,
      brightness: 56,
      contrast: 52,
    },
    Landscape: {
      sharpness: 70,
      denoise: 44,
      faceEnhancement: 50,
      colorLevel: 66,
      hdrLevel: 64,
      brightness: 50,
      contrast: 58,
    },
    Artwork: {
      sharpness: 64,
      denoise: 58,
      faceEnhancement: 50,
      colorLevel: 70,
      hdrLevel: 56,
      brightness: 52,
      contrast: 55,
    },
  },
};

/**
 * Build a full EnhancementOptions object for the given model preset.
 * `base` keeps unrelated options (scale, booleans) as they are.
 */
export function buildPresetOptions(
  modelKey: ModelKey,
  preset: string,
  base: EnhancementOptions
): EnhancementOptions {
  const settings =
    PRESET_SETTINGS[modelKey]?.[preset] || PRESET_SETTINGS[modelKey]?.Standard || {};

  return {
    ...base,
    preset,
    sharpness: settings.sharpness ?? 50,
    sharpenLevel: settings.sharpness ?? 50,
    sharpen: true,
    denoise: settings.denoise ?? 50,
    removeNoiseLevel: settings.denoise ?? 50,
    removeNoise: true,
    faceEnhancement: settings.faceEnhancement ?? 50,
    faceRestoreLevel: settings.faceEnhancement ?? 50,
    faceRestore: (settings.faceEnhancement ?? 50) > 50,
    colorLevel: settings.colorLevel ?? 50,
    colorEnhance: (settings.colorLevel ?? 50) !== 50,
    hdrLevel: settings.hdrLevel ?? 50,
    hdrBoost: (settings.hdrLevel ?? 50) > 50,
    brightness: settings.brightness ?? 50,
    contrast: settings.contrast ?? 50,
  };
}

/** Preset whose settings are all-neutral (i.e. the "Standard"/"Balanced" one). */
export function getDefaultPreset(modelKey: ModelKey): string {
  return modelKey === 'vitality' ? 'Standard' : 'Balanced';
}

export const MODELS: Record<ModelKey, ModelConfig> = {
  vitality: {
    name: 'Vitality (Fast / Clean)',
    file: 'models/Vitality.onnx',
    tileSize: 128,
    scale: 4,
    color: 'rgb',
    size: '1.9MB',
    badges: {
      quality: 'Ultra Fast & Crisp',
      time: '~120ms',
      req: 'Ultra-Lightweight / SIMD',
    },
    description:
      'Vitality is a lightweight high-clarity super-resolution model engineered for crisp edge reconstruction, de-blurring, and clean textures with minimal memory footprint.',
    recommendation: 'Best for instant previews, illustrations, portraits, anime, and fast processing on any hardware.',
    maxScale: 8,
    presets: ['Standard', 'Fast', 'Crisp', 'Illustration'],
    defaultPreset: 'Standard',
    features: {
      faceRestore: true,
      colorEnhance: true,
      hdrBoost: true,
    },
  },
  'pixel-dance': {
    name: 'Pixel-Dance (Extreme Clarity & 8K)',
    file: 'models/Pixel-Dance.onnx',
    tileSize: 128,
    scale: 4,
    color: 'rgb',
    size: '67MB',
    badges: {
      quality: '8K Ultra Precision',
      time: '~650ms',
      req: 'WebGPU Preferred',
    },
    description:
      'Pixel-Dance is a premier generative super-resolution model that reconstructs intricate realistic textures, micro-edges, and sharp photographic depth.',
    recommendation: 'Best for high-end photography, complex scenery, architectural details, and 8K fine-art prints.',
    maxScale: 8,
    presets: ['Balanced', 'PixelDance', 'Photography', 'Landscape'],
    defaultPreset: 'Balanced',
    features: {
      faceRestore: true,
      colorEnhance: true,
      hdrBoost: true,
    },
  },
  'alpha-satoru': {
    name: 'Alpha-Satoru (Studio / 4× / 8×)',
    file: 'models/Alpha-Satoru.onnx',
    tileSize: 128,
    scale: 4,
    color: 'rgb',
    size: '65MB',
    badges: {
      quality: '8K Ultra Precision',
      time: '~450ms',
      req: 'WebGPU Preferred',
    },
    description:
      'Alpha-Satoru is a state-of-the-art super-resolution network that reconstructs high-frequency details, removes compression artifacts, and restores crisp focus.',
    recommendation: 'Best for portraits, professional photos, high-res prints, and 8K displays.',
    maxScale: 8,
    presets: ['Balanced', 'Portrait', 'Landscape', 'Artwork'],
    defaultPreset: 'Balanced',
    features: {
      faceRestore: true,
      colorEnhance: true,
      hdrBoost: true,
    },
  },
};

export const MAX_OUTPUT_DIM = 16384;

export function detectBackend(): 'webgpu' | 'wasm' {
  const isSecure =
    location.hostname === 'localhost' || location.protocol === 'https:';
  if (isSecure && 'gpu' in navigator && navigator.gpu) return 'webgpu';
  return 'wasm';
}

export const BACKGROUND_PROMPTS: BackgroundPrompt[] = [
  {
    id: 'futuristic',
    category: 'Futuristic',
    title: 'Neon Aurora Glow',
    prompt: 'A futuristic aurora gradient with soft neon blue and purple glows, abstract flowing light, ultra minimal, cinematic lighting, premium SaaS landing page background, no objects, dark theme, high resolution.',
    tags: ['Neon', 'Aurora', 'Cinematic', 'Dark Mode']
  },
  {
    id: 'glassmorphism',
    category: 'Glassmorphism',
    title: 'Translucent Ambient Glow',
    prompt: 'Dark glassmorphism interface background with floating translucent panels, subtle reflections, cyan and violet ambient glow, premium UI aesthetic, ultra clean, minimal.',
    tags: ['Glass', 'Translucent', 'Cyan Glow', 'Minimal']
  },
  {
    id: 'mesh-gradient',
    category: 'Mesh Gradient',
    title: 'Indigo & Cyan Mesh',
    prompt: 'Abstract mesh gradient in indigo, cyan, purple, soft blur, smooth transitions, premium AI startup landing page, modern web design background, dark mode.',
    tags: ['Mesh', 'Gradient', 'Indigo', 'Modern']
  },
  {
    id: 'technology',
    category: 'Technology',
    title: 'Neural Network Waves',
    prompt: 'Abstract AI neural network made of glowing particles and flowing lines on a dark background, elegant, futuristic, minimal, soft blue and violet lighting, high-end technology aesthetic.',
    tags: ['AI', 'Neural Lines', 'Particles', 'High-End']
  },
  {
    id: 'luxury',
    category: 'Luxury',
    title: 'Metallic Streaks & Grain',
    prompt: 'Minimal black background with soft metallic gradients, elegant blue light streaks, subtle grain texture, luxury SaaS product design, modern premium aesthetic.',
    tags: ['Luxury', 'Metallic', 'Black Theme', 'Grain']
  }
];

export const FEATURES = [
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'Hardware-accelerated local WebGPU inference delivers 8K results in milliseconds.'
  },
  {
    icon: '✨',
    title: 'AI Detail Enhancement',
    description: 'Generative edge reconstruction restores missing micro-textures and subtle contrast.'
  },
  {
    icon: '🎯',
    title: 'Face Restoration',
    description: 'AI facial landmark detector smooths skin, enhances eyes, and fixes portrait blur.'
  },
  {
    icon: '📸',
    title: '8K Ultra Super-Res',
    description: 'Scale low-res images up to 8K resolution (7680×4320) with lossless detail.'
  },
  {
    icon: '🖌',
    title: 'Smart Noise & Artifact Removal',
    description: 'Wipes out heavy JPEG compression artifacts, grain, and banding in 1-click.'
  },
  {
    icon: '🔒',
    title: '100% Privacy-First',
    description: 'All processing happens 100% client-side inside your browser. No server uploads.'
  }
];

export const FAQS = [
  {
    q: 'How does client-side AI image upscaling work?',
    a: 'We leverage ONNX Runtime Web with WebGPU / WebAssembly acceleration. Neural network models run directly in your web browser, using your GPU to process pixel tensors without sending images to any remote server.'
  },
  {
    q: 'Does it cost money or require credits?',
    a: 'No! The browser studio runs 100% locally on your machine, so you can upscale unlimited photos, portraits, and graphics completely free of charge.'
  },
  {
    q: 'What is the maximum image size I can upscale?',
    a: 'You can input images up to 40MB and output up to 16,384 x 16,384 pixels (equivalent to 16K resolution) depending on your computer’s GPU memory.'
  },
  {
    q: 'Which image formats are supported?',
    a: 'We support PNG, JPEG, WEBP, GIF, and SVG inputs, with output options for lossless PNG, optimized WebP, or high-quality JPEG.'
  },
  {
    q: 'Do I need to install software or create an account?',
    a: 'No installation and no registration are required. Pixelify works directly in your browser: open the page, drop an image, and start upscaling. No sign-up, no email, no watermark on results.'
  },
  {
    q: 'Can I use the AI upscaler on my phone or tablet?',
    a: 'Yes. The studio is fully responsive and works on modern mobile browsers such as Chrome and Safari. For the fastest processing we recommend a device with WebGPU support, but WebAssembly fallback keeps it working everywhere.'
  },
  {
    q: 'Is the upscaled result watermarked?',
    a: 'Never. Output images are rendered locally on your device and downloaded without any watermark, logo, or quality cap. What you export is exactly what you see in the preview.'
  }
];

/* ==========================================================================
   BACKGROUND REMOVER PAGE CONTENT (SEO / ADS-READY SECTIONS)
   ========================================================================== */

export const BG_FEATURES = [
  {
    icon: '🪄',
    title: 'One-Click Neural Cutouts',
    description: 'Chopper AI detects your subject instantly and strips the background in a single click. No manual lassoing or green-screen required.'
  },
  {
    icon: '💇',
    title: 'Hair & Fur Precision',
    description: 'Bilateral reference segmentation preserves fine hair strands, fur, and semi-transparent edges that basic background erasers destroy.'
  },
  {
    icon: '🖼️',
    title: 'Replace or Blur Backgrounds',
    description: 'Drop your subject onto transparent, solid color, gradient, or custom photo backgrounds without ever leaving the canvas.'
  },
  {
    icon: '🖌️',
    title: 'Erase & Restore Brushes',
    description: 'Refine any edge after processing with real-time brushes, adjustable radii, zoom lens, and a full undo / redo history stack.'
  },
  {
    icon: '✨',
    title: 'Studio-Ready Effects',
    description: 'Add soft drop shadows, outlines, and brightness / contrast / saturation adjustments for polished e-commerce ready images.'
  },
  {
    icon: '🔒',
    title: '100% Private & Free',
    description: 'The neural network runs entirely inside your browser with Transformers.js. No uploads, no account, no watermark, and unlimited images.'
  }
];

export const BG_HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Upload Your Image',
    desc: 'Drag & drop a PNG, JPG, or WebP photo up to 20 MB, paste it with Ctrl+V, or click a sample image to try it instantly.',
    icon: '📥'
  },
  {
    num: '02',
    title: 'AI Removes the Background',
    desc: 'The Chopper model segments your subject on-device in seconds, fully automatically. Hair, glass, and complex edges included.',
    icon: '🪄'
  },
  {
    num: '03',
    title: 'Refine, Replace & Download',
    desc: 'Swap the background, apply effects, brush-fix edges, then export a transparent PNG, WebP, or JPG with one click.',
    icon: '⚡'
  }
];

export const BG_FAQS = [
  {
    q: 'How do I remove the background from a photo for free?',
    a: 'Open the Background Remover page, drag your image into the upload area, and the AI cutout starts automatically. When processing finishes you can download a transparent PNG for free. No sign-up, no credits, and no watermark.'
  },
  {
    q: 'Are my images uploaded to a server?',
    a: 'No. Pixelify runs the Chopper segmentation model directly inside your browser using Transformers.js with WebGPU / WebAssembly. Your photos never leave your device, which makes it safe for private or client work.'
  },
  {
    q: 'Which image formats are supported?',
    a: 'You can upload PNG, JPG, and WebP images up to 20 MB. Results export as transparent PNG (recommended for cutouts), WebP for the web, or JPG with a solid background.'
  },
  {
    q: 'Can I replace the background with another photo or color?',
    a: 'Yes. After the cutout completes, open the Background tab to place your subject on a transparent, solid color, gradient preset, or your own uploaded photo, then download the composite in one click.'
  },
  {
    q: 'Does it work on hair, fur, and transparent objects?',
    a: 'Yes. The Chopper segmentation architecture is specifically trained to preserve hair strands, fur, glass, and semi-transparent edges far better than classic color-key tools.'
  },
  {
    q: 'Can I use it on a phone or tablet?',
    a: 'Yes. The workspace is fully responsive and works in mobile browsers like Chrome and Safari. On devices without WebGPU it automatically falls back to WebAssembly, so cutouts still work everywhere.'
  },
  {
    q: 'Why does the first image take longer to process?',
    a: 'The neural model (roughly 40 MB) is downloaded to your browser cache the first time. After that it is reused, so every following image is processed much faster.'
  }
];

/* ==========================================================================
   ADVANTAGE STRIPS (DLBunny-STYLE "Advantages" SECTIONS)
   ========================================================================== */

export interface AdvantageItem {
  title: string;
  desc: string;
  icon: string;
}

export const UPSCALER_ADVANTAGES: AdvantageItem[] = [
  {
    title: 'Free & Unlimited',
    desc: 'Upscale as many photos as you want. There are no daily caps, credits, or subscriptions.',
    icon: '♾️'
  },
  {
    title: 'No Sign-Up Required',
    desc: 'Open the page and start working immediately. No account, email, or login ever needed.',
    icon: '🚫'
  },
  {
    title: 'Runs on Your Device',
    desc: 'WebGPU / WASM inference means zero uploads, ideal for private, NDA, or client images.',
    icon: '💻'
  },
  {
    title: 'Watermark-Free Output',
    desc: 'Download lossless PNG or WebP exports with no watermark, logo, or quality penalty.',
    icon: '✅'
  }
];

export const BG_ADVANTAGES: AdvantageItem[] = [
  {
    title: 'Completely Free',
    desc: 'Bookmark the page and remove backgrounds from unlimited images, free forever.',
    icon: '🆓'
  },
  {
    title: 'No Registration',
    desc: 'No account or email needed. Drop an image and the AI starts cutting instantly.',
    icon: '🔓'
  },
  {
    title: 'Private by Design',
    desc: 'Every cutout is computed locally in your browser. Images are never uploaded anywhere.',
    icon: '🛡️'
  },
  {
    title: 'Email & GitHub Support',
    desc: 'Hit a problem? Reach the team through the support links in the footer and get help fast.',
    icon: '📮'
  }
];
