import { loadAndCompile, loadLiteRt, Tensor, supportsFeature } from '@litertjs/core';

type InitMessage = { type: 'init'; id: number; bytes: ArrayBuffer; accelerator: 'wasm' | 'webgpu' };
type RunMessage = { type: 'run'; id: number; data: ArrayBuffer; shape: number[]; inputName: string; outputName: string };
type ReleaseMessage = { type: 'release' };
let model: any;
let inputDetails: any[] = [];
let outputDetails: any[] = [];

const SOFTWARE_ADAPTER_RE = /swiftshader|software|llvmpipe|lavapipe/;
const ADAPTER_PROBE_TIMEOUT_MS = 3000;

/** Rejects virtual/software adapters so WebGPU is only picked where real hardware GPUs exist. */
async function ensureHardwareWebGPUAdapter(): Promise<void> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ADAPTER_PROBE_TIMEOUT_MS));
  const adapter = await Promise.race([gpu?.requestAdapter?.(), timeout]);
  if (!adapter || adapter.isFallbackAdapter) throw new Error('No hardware WebGPU adapter is reachable inside this worker.');
  const info = adapter.info;
  const description = [info?.vendor, info?.architecture, info?.device, info?.description].join(' ').toLowerCase();
  if (SOFTWARE_ADAPTER_RE.test(description)) throw new Error(`WebGPU resolves to a software adapter (${description || 'unknown'}) inside this worker.`);
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async ({ data }: MessageEvent<InitMessage | RunMessage | ReleaseMessage>) => {
  if (data.type === 'release') {
    model?.delete?.();
    model = undefined;
    scope.close();
    return;
  }
  if (data.type === 'init') {
    try {
      // Emscripten's worker branch resolves .wasm artifacts against the worker
      // script location (/_next/static/chunks/…), not the base passed to
      // loadLiteRt. Seed the global Module with an explicit locateFile so the
      // runtime artifacts resolve to the public /litert/wasm/ directory.
      (self as unknown as { Module?: unknown }).Module = { locateFile: (path: string) => '/litert/wasm/' + path };
      if (data.accelerator === 'webgpu') await ensureHardwareWebGPUAdapter();
      const jspi = await supportsFeature('jspi').catch(() => false);
      await loadLiteRt('/litert/wasm/', { jspi });
      model = await loadAndCompile(new Uint8Array(data.bytes), { accelerator: data.accelerator });
      inputDetails = model.getInputDetails();
      outputDetails = model.getOutputDetails();
      const serializable = (details: any[]) => details.map(({ name, shape, type }: any) => ({ name, shape: Array.from(shape), type }));
      scope.postMessage({ type: 'ready', id: data.id, inputDetails: serializable(inputDetails), outputDetails: serializable(outputDetails) });
    } catch (error) {
      scope.postMessage({ type: 'error', id: data.id, error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (data.type === 'run') {
    let input: any;
    let outputs: any;
    try {
      input = new Tensor(new Float32Array(data.data), data.shape, 'float32');
      outputs = await model.run({ [data.inputName]: input });
      const output = Array.isArray(outputs) ? outputs[0] : outputs[data.outputName];
      const cpu = await output.moveTo('wasm');
      const result = new Float32Array(cpu.toTypedArray() as Float32Array);
      if (cpu !== output) cpu.delete();
      scope.postMessage({ type: 'result', id: data.id, data: result.buffer }, [result.buffer]);
    } catch (error) {
      scope.postMessage({ type: 'error', id: data.id, error: error instanceof Error ? error.message : String(error) });
    } finally {
      input?.delete?.();
      outputs?.delete?.();
      if (outputs && !Array.isArray(outputs)) Object.values(outputs).forEach((tensor: any) => tensor?.delete?.());
      else if (Array.isArray(outputs)) outputs.forEach((tensor: any) => tensor?.delete?.());
    }
  }
};
