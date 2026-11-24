import { loadAndCompile, loadLiteRt, Tensor, isWebGPUSupported, supportsFeature } from '@litertjs/core';

export type UpscalerAccelerator = 'wasm' | 'webgpu';
export interface LiteRtRuntime { loadAndCompile: typeof loadAndCompile; Tensor: typeof Tensor; isWebGPUSupported: typeof isWebGPUSupported }
let runtimePromise: Promise<LiteRtRuntime> | null = null;

/** Initialize LiteRT once; WASM artifacts are served locally for offline/cache-safe startup. */
export function loadLiteRT(): Promise<LiteRtRuntime> {
  if (typeof window !== 'undefined') {
    const g = window as any;
    // Keep the execution runtime on the same origin as the app. The model
    // itself may be remote, but a stalled WASM fetch otherwise leaves the
    // workspace stuck at "Loading AI model" with no model progress to show.
    g.HF_COMPACT_INTERNAL = '/litert/wasm/litert_wasm_compat_internal.wasm';
    g.HF_COMPAT_INTERNAL = g.HF_COMPACT_INTERNAL;
    g.HF_INTERNAL = '/litert/wasm/litert_wasm_internal.wasm';
    g.HF_JSPI_INTERNAL = '/litert/wasm/litert_wasm_jspi_internal.wasm';
    g.HF_THREADED_INTERNAL = '/litert/wasm/litert_wasm_threaded_internal.wasm';
  }
  if (!runtimePromise) {
    runtimePromise = supportsFeature('jspi')
      .catch(() => false)
      .then((jspi) => loadLiteRt('/litert/wasm/', { jspi }).then(() => ({ loadAndCompile, Tensor, isWebGPUSupported })));
    runtimePromise.catch(() => { runtimePromise = null; });
  }
  return runtimePromise;
}
