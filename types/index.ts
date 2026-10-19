export type Step = 'upload' | 'config' | 'processing' | 'result';
export type Backend = 'webgpu' | 'wasm';
export type ModelKey = 'vitality' | 'pixel-dance' | 'alpha-satoru';
export type ScaleFactor = 2 | 4 | 8;
export type ViewTab = 'home' | 'upscaler' | 'bg_remove' | 'blogs' | 'prompts' | 'batch' | 'static';
export type ThemeMode = 'dark' | 'light' | 'system';
export type CompareMode = 'slider' | 'sideBySide' | 'zoomLens';

export interface ModelBadges {
  quality: string;
  time: string;
  req: string;
}

export interface ModelFeatures {
  faceRestore?: boolean;
  colorEnhance?: boolean;
  hdrBoost?: boolean;
}

export interface ModelConfig {
  name: string;
  file: string;
  tileSize: number;
  scale: number;
  color: 'y' | 'rgb';
  size: string;
  badges: ModelBadges;
  description: string;
  recommendation: string;
  maxScale?: number;
  presets?: string[];
  /** Preset applied by default for this model (must exist in `presets`). */
  defaultPreset?: string;
  features?: ModelFeatures;
}

export interface ImageData {
  file: File;
  url: string;
  img: HTMLImageElement;
  width: number;
  height: number;
  name: string;
  size: number;
}

export type UpscaleStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface UpscaleItem {
  id: string;
  file: File;
  name: string;
  url: string;
  img: HTMLImageElement;
  width: number;
  height: number;
  size: number;
  status: UpscaleStatus;
  progress: ProgressState;
  result: ProcessResult | null;
  error: string | null;
  options: EnhancementOptions;
  modelKey: ModelKey;
}

export interface EnhancementOptions {
  scale: ScaleFactor;
  faceRestore: boolean;
  removeNoise: boolean;
  sharpen: boolean;
  colorEnhance: boolean;
  hdrBoost: boolean;

  // numeric levels 0-100
  sharpenLevel?: number;
  removeNoiseLevel?: number;
  faceRestoreLevel?: number;
  sharpness?: number;
  denoise?: number;
  faceEnhancement?: number;
  colorLevel?: number;
  hdrLevel?: number;
  brightness?: number;
  contrast?: number;
  preset?: string;
}

export interface UpscaleResult {
  type: 'upscale';
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  time: number;
  psnrGain?: string;
  detailGain?: string;
  enhancementsApplied?: string[];
  dataUrl?: string;
}

export type ProcessResult = UpscaleResult;

export interface ProgressState {
  percent: number;
  text: string;
  stepIndex?: number;
  totalSteps?: number;
}

export interface BatchItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  originalUrl?: string;
  resultUrl?: string;
  resultWidth?: number;
  resultHeight?: number;
  error?: string;
}

export interface BackgroundPrompt {
  id: string;
  category: 'Futuristic' | 'Glassmorphism' | 'Mesh Gradient' | 'Technology' | 'Luxury';
  title: string;
  prompt: string;
  tags: string[];
}

export interface BGJob {
  id: string;
  file: File;
  name: string;
  sourceUrl: string;
  resultUrl: string | null;
  resultBlob: Blob | null;
  status: 'ready' | 'loading' | 'processing' | 'done' | 'error';
  progress: number;
  message: string;
  elapsedMs?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

/** One AI model that is currently downloading (first-time cache fill). */
export interface ModelDownloadItem {
  id: string;
  name: string;
  /** Download progress 0–100. */
  progress: number;
}

