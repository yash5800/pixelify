/**
 * bgEngine.ts — where a background-removal cutout was actually computed.
 *
 * The BG remover has two independent axes:
 *
 *   1. *Where* the segmentation runs — the visitor's device or our server.
 *   2. *On what* it runs — the device path can use the GPU (WebGPU) or fall
 *      back to the CPU (WebAssembly); the cloud path is always a CPU.
 *
 * The cloud engine pins the CPU execution provider on the server
 * (server/chopperModel.mjs) and ships no CUDA payload, so 'cloud' always
 * means 'a CPU somewhere else' — never a GPU.
 *
 * This module turns that into one small, reusable description so the toast,
 * the job badge and the job message all describe an output the same way.
 */

import type { BGJobEngine } from '../types';

export type { BGJobEngine };

export interface EngineDescription {
  source: BGJobEngine;
  /** Compact pill text, e.g. "GPU", "CPU", "CLOUD CPU". */
  short: string;
  /** One-line sentence used in the completion toast. */
  label: string;
  /** Longer explanation shown as a tooltip. */
  detail: string;
  /** Tailwind classes for the pill, matching the navbar's engine colours. */
  pill: string;
  /** Which lucide-react icon represents it. */
  icon: 'gpu' | 'cpu' | 'cloud';
}

const DESCRIPTIONS: Record<BGJobEngine, EngineDescription> = {
  'device-webgpu': {
    source: 'device-webgpu',
    short: 'GPU',
    label: 'processed on your GPU (WebGPU)',
    detail:
      'The cutout was computed in this browser on your GPU through the WebGPU ' +
      'execution provider. Nothing was uploaded.',
    pill: 'text-[#00FF85] bg-[#00FF85]/10 border-[#00FF85]/20',
    icon: 'gpu',
  },
  'device-wasm': {
    source: 'device-wasm',
    short: 'CPU',
    label: 'processed on your CPU (WebAssembly)',
    detail:
      'The cutout was computed in this browser on your CPU through the ' +
      'WebAssembly execution provider. Nothing was uploaded.',
    pill: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
    icon: 'cpu',
  },
  'cloud-cpu': {
    source: 'cloud-cpu',
    short: 'CLOUD',
    label: 'processed on our server CPU (Cloud)',
    detail:
      'The cutout was computed on our server CPU. Only a 512x512 thumbnail was ' +
      'uploaded; the full-resolution photo stayed on your device.',
    pill: 'text-violet-300 bg-violet-400/10 border-violet-400/20',
    icon: 'cloud',
  },
};

/**
 * Human-readable description of where a cutout ran.
 *
 * `cloudRunsLocally` is set when the /api functions are mounted by a local
 * Node server: the "cloud" engine then runs on the visitor's own machine, so
 * the wording must not claim it happened on a remote server.
 */
export function describeEngine(
  source: BGJobEngine,
  options?: { cloudRunsLocally?: boolean }
): EngineDescription {
  const base = DESCRIPTIONS[source];
  if (source === 'cloud-cpu' && options?.cloudRunsLocally) {
    return {
      ...base,
      label: "processed on this machine's CPU (local cloud engine)",
      detail:
        'The cutout was computed by the local /api server on this machine, using ' +
        'its CPU. The cloud engine is a serverless function, so on a real ' +
        'deployment the very same code runs on our server CPU instead.',
    };
  }
  return base;
}

/**
 * Map the on-device worker engine ('wasm' | 'webgpu') onto the job engine
 * type. Anything unexpected falls back to the CPU path, which is the safe
 * answer: it is the one that is guaranteed to work.
 */
export function deviceEngineSource(engine: 'wasm' | 'webgpu' | null | undefined): BGJobEngine {
  return engine === 'webgpu' ? 'device-webgpu' : 'device-wasm';
}
