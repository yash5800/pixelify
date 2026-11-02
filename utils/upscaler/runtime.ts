import { loadAndCompile, loadLiteRt, Tensor, isWebGPUSupported, supportsFeature } from '@litertjs/core';

export type UpscalerAccelerator = 'wasm' | 'webgpu';
export interface LiteRtRuntime { loadAndCompile: typeof loadAndCompile; Tensor: typeof Tensor; isWebGPUSupported: typeof isWebGPUSupported }
let runtimePromise: Promise<LiteRtRuntime> | null = null;

/** Initialize LiteRT once; WASM artifacts are served locally for offline/cache-safe startup. */
export function loadLiteRT(): Promise<LiteRtRuntime> {
  if (!runtimePromise) {
    runtimePromise = supportsFeature('jspi')
      .catch(() => false)
      .then((jspi) => loadLiteRt('/litert/wasm/', { jspi }).then(() => ({ loadAndCompile, Tensor, isWebGPUSupported })));
    runtimePromise.catch(() => { runtimePromise = null; });
  }
  return runtimePromise;
}
