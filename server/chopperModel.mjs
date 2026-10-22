/**
 * chopperModel.mjs — server-side Chopper inference core.
 *
 * Runs the exact same model the browser runs on-device
 * (`studioludens/birefnet-lite-512`, fp32 ONNX) on a CPU, so the optional
 * "Cloud (CPU)" engine produces the same cutouts without the visitor having
 * to download 192 MB of weights.
 *
 * Design notes (Vercel Hobby: 2 GB RAM / 1 vCPU / 300 s):
 *  - The weights are downloaded once from Hugging Face into the function's
 *    writable /tmp, which survives between warm invocations of the same
 *    instance. Cold start pays the 192 MB download once.
 *  - Only the model is downloaded; the caller sends a 512x512 RGB thumbnail
 *    (768 KB) and receives a 512x512 alpha mask (256 KB). The original pixels
 *    never leave the visitor's device.
 *  - Inference is serialized (single-flight) so two concurrent requests can
 *    never double the resident set.
 *
 * The module is plain ESM JavaScript on purpose: it is imported unchanged by
 * the Vercel function (`api/*.js`), by the local dev server and by the
 * parity/benchmark scripts, with no build step in between.
 */

import { createWriteStream, existsSync, mkdirSync, copyFileSync, renameSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SELF_DIR = dirname(fileURLToPath(import.meta.url));

export const MODEL_ID = 'studioludens/birefnet-lite-512';
export const MODEL_URL =
  'https://huggingface.co/studioludens/birefnet-lite-512/resolve/main/onnx/model.onnx';

/** The model is a fixed-resolution segmenter. */
export const INPUT_SIZE = 512;
export const CHANNELS = 3;
export const MASK_BYTES = INPUT_SIZE * INPUT_SIZE;
export const RGB_BYTES = INPUT_SIZE * INPUT_SIZE * CHANNELS;

/** ViT feature-extractor normalization (preprocessor_config.json). */
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

const CACHE_DIR = process.env.CHOPPER_CACHE_DIR || '/tmp/chopper';
const MODEL_PATH = process.env.CHOPPER_MODEL_PATH || join(CACHE_DIR, 'model.onnx');

/** Threads: Hobby gives a single vCPU, so one intra-op thread is the sweet spot. */
const THREADS = Number(process.env.CHOPPER_THREADS || 1);
/**
 * The CPU memory arena caches allocations between runs. On a 2 GB Hobby
 * instance that costs ~600 MB of resident memory for ~0-15 % of speed, so the
 * arena stays off unless CHOPPER_ARENA=1 is set explicitly.
 */
const ARENA = process.env.CHOPPER_ARENA === '1';

/**
 * How long a request may wait for the model to become usable. The weights
 * are downloaded on the first request of a fresh instance, which can take a
 * while on a slow link; a request that keeps waiting would run into the
 * platform's own function timeout, so it is answered with 503 instead and
 * the download continues in the background.
 */
export const MODEL_WAIT_MS = Number(process.env.CHOPPER_MODEL_WAIT_MS || 120000);

/** 'idle' | 'downloading' | 'loading' | 'ready' | 'failed' */
let state = 'idle';
let lastError = null;

let sessionPromise = null;
let sessionInfo = null;
let modelPromise = null;

/* ------------------------------------------------------------------ */
/* native binding bootstrap                                            */
/* ------------------------------------------------------------------ */

/**
 * onnxruntime-node loads its native addon with a *dynamic* require
 * (`require(`../bin/napi-v3/${process.platform}/${process.arch}/...`)`), which
 * bundlers cannot follow reliably. The addon therefore has to sit next to the
 * package (normal layout) or next to the bundle (bundled layout).
 *
 * This function locates the addon directory (the .node file together with the
 * libonnxruntime shared object it dlopen()s) and copies it into every place
 * the dynamic require might look, so the deployment works either way.
 */
function ensureNativeBinding() {
  const packageDir = (() => {
    try {
      return dirname(require.resolve('onnxruntime-node/package.json'));
    } catch {
      return null;
    }
  })();

  // Where the addon may already live.
  const sourceRoots = [
    packageDir,
    join(process.cwd(), 'node_modules', 'onnxruntime-node'),
    join(SELF_DIR, '..', 'node_modules', 'onnxruntime-node'),
    '/var/task/node_modules/onnxruntime-node',
  ].filter(Boolean);

  // Where the dynamic require may look.
  const targetRoots = [
    packageDir,
    join(SELF_DIR, '..', 'node_modules', 'onnxruntime-node'),
    join(process.cwd(), 'node_modules', 'onnxruntime-node'),
    process.cwd(),
  ].filter(Boolean);

  // The addon lives in bin/napi-v<major>/<platform>/<arch>/ — the N-API
  // major version differs between onnxruntime-node releases (v3 in 1.19.x,
  // v6 in newer builds), so it is discovered instead of hard-coded.
  const findAddonDir = () => {
    for (const root of sourceRoots) {
      const binDir = join(root, 'bin');
      if (!existsSync(binDir)) continue;
      let napiDirs = [];
      try {
        napiDirs = readdirSync(binDir);
      } catch {
        continue;
      }
      for (const napi of napiDirs) {
        const candidate = join(binDir, napi, process.platform, process.arch);
        if (existsSync(join(candidate, 'onnxruntime_binding.node'))) return candidate;
      }
    }
    return null;
  };

  const source = findAddonDir();
  if (!source) return; // Let the import fail with its own (clearer) error.

  for (const root of targetRoots) {
    // Keep the N-API major version of the source directory.
    const napi = basename(dirname(dirname(source)));
    const target = join(root, 'bin', napi, process.platform, process.arch);
    if (target === source) continue;
    if (existsSync(join(target, 'onnxruntime_binding.node'))) continue;
    try {
      mkdirSync(target, { recursive: true });
      for (const file of readdirSync(source)) {
        const from = join(source, file);
        const to = join(target, file);
        if (existsSync(to)) continue;
        copyFileSync(from, to);
      }
    } catch {
      /* best effort — the import below reports the real problem */
    }
  }
}

/* ------------------------------------------------------------------ */
/* weights                                                            */
/* ------------------------------------------------------------------ */

async function downloadModel(destination) {
  mkdirSync(join(destination, '..'), { recursive: true });
  const tmp = `${destination}.download`;
  const response = await fetch(MODEL_URL, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download model weights (HTTP ${response.status}).`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tmp));
  renameSync(tmp, destination);
}

async function ensureModelFile() {
  if (existsSync(MODEL_PATH)) {
    const { size } = statSync(MODEL_PATH);
    if (size > 1024 * 1024) return MODEL_PATH;
  }
  if (!modelPromise) {
    modelPromise = (async () => {
      const startedAt = Date.now();
      state = 'downloading';
      await downloadModel(MODEL_PATH);
      const { size } = statSync(MODEL_PATH);
      if (size < 1024 * 1024) {
        throw new Error('Downloaded model file is too small to be valid.');
      }
      state = 'loading';
      sessionInfo = {
        ...(sessionInfo || {}),
        modelDownloadMs: Date.now() - startedAt,
        modelBytes: size,
      };
      return MODEL_PATH;
    })().catch((error) => {
      modelPromise = null;
      state = 'failed';
      lastError = error instanceof Error ? error.message : String(error);
      throw error;
    });
  }
  return modelPromise;
}

/* ------------------------------------------------------------------ */
/* session                                                            */
/* ------------------------------------------------------------------ */

export async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      if (state === 'idle') state = 'loading';
      ensureNativeBinding();
      const { default: ort } = await import('onnxruntime-node');
      const path = await ensureModelFile();
      const startedAt = Date.now();
      const session = await ort.InferenceSession.create(path, {
        executionMode: 'sequential',
        graphOptimizationLevel: 'all',
        intraOpNumThreads: THREADS,
        interOpNumThreads: 1,
        enableCpuMemArena: ARENA,
        enableMemPattern: false,
      });
      sessionInfo = {
        ...(sessionInfo || {}),
        sessionCreateMs: Date.now() - startedAt,
        inputNames: session.inputNames,
        outputNames: session.outputNames,
        threads: THREADS,
        arena: ARENA,
        ortVersion: ort.env?.versions?.common || null,
      };
      state = 'ready';
      lastError = null;
      return session;
    })().catch((error) => {
      sessionPromise = null;
      state = 'failed';
      lastError = error instanceof Error ? error.message : String(error);
      throw error;
    });
  }
  return sessionPromise;
}

/**
 * Race a promise against the model warm-up budget. The work keeps running in
 * the background — only the *answer* is cut short — so the next request
 * finds a warm model.
 */
export function withModelWaitTimeout(promise, ms = MODEL_WAIT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(
        'The cloud engine is still preparing the model (first run downloads it).'
      );
      error.code = 'model_warming_up';
      reject(error);
    }, ms);
    if (typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ------------------------------------------------------------------ */
/* inference                                                          */
/* ------------------------------------------------------------------ */

/**
 * Normalize packed RGB (512*512*3 bytes) into the NCHW float32 tensor the
 * model expects. Mirrors the ViT feature extractor used on-device:
 * (value / 255 - mean) / std.
 */
export function toTensorData(rgb) {
  const plane = INPUT_SIZE * INPUT_SIZE;
  const data = new Float32Array(plane * CHANNELS);
  for (let c = 0; c < CHANNELS; c += 1) {
    const mean = MEAN[c];
    const std = STD[c];
    const offset = c * plane;
    for (let i = 0; i < plane; i += 1) {
      data[offset + i] = (rgb[i * CHANNELS + c] / 255 - mean) / std;
    }
  }
  return data;
}

/**
 * Convert raw model output (logits) into a uint8 alpha mask, matching the
 * on-device pipeline: sigmoid when the values are not already probabilities,
 * then scale to 0-255.
 */
export function toMask(logits) {
  const mask = new Uint8Array(MASK_BYTES);
  const length = Math.min(logits.length, MASK_BYTES);
  let needsSigmoid = false;
  for (let i = 0; i < length; i += 1) {
    const value = logits[i];
    if (value < -1e-5 || value > 1 + 1e-5) {
      needsSigmoid = true;
      break;
    }
  }
  for (let i = 0; i < length; i += 1) {
    let value = logits[i];
    if (needsSigmoid) value = 1 / (1 + Math.exp(-value));
    const scaled = Math.round(value * 255);
    mask[i] = scaled < 0 ? 0 : scaled > 255 ? 255 : scaled;
  }
  return mask;
}

/** Serialized inference: a second request waits instead of doubling the RSS. */
let queue = Promise.resolve();

export function enqueue(task) {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

/**
 * Run the segmenter on a packed 512x512 RGB buffer and return a 512x512
 * uint8 alpha mask.
 */
export async function computeMask(rgb) {
  if (!rgb || rgb.length !== RGB_BYTES) {
    throw new Error(`Expected ${RGB_BYTES} bytes of RGB data, received ${rgb ? rgb.length : 0}.`);
  }
  return enqueue(async () => {
    const session = await getSession();
    const { default: ort } = await import('onnxruntime-node');
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const tensor = new ort.Tensor('float32', toTensorData(rgb), [1, CHANNELS, INPUT_SIZE, INPUT_SIZE]);
    const startedAt = Date.now();
    const outputs = await session.run({ [inputName]: tensor });
    const result = outputs[outputName];
    const mask = toMask(result.data);
    sessionInfo = {
      ...(sessionInfo || {}),
      lastInferenceMs: Date.now() - startedAt,
      lastMaskBytes: mask.length,
    };
    return mask;
  });
}

export function getStatus() {
  const memory = process.memoryUsage();
  return {
    modelId: MODEL_ID,
    modelPath: MODEL_PATH,
    state,
    // `ready` is only true once the session actually exists — the weights
    // may still be downloading.
    ready: state === 'ready',
    ...(lastError ? { lastError } : {}),
    ...(sessionInfo || {}),
    rssMb: Math.round(memory.rss / 1048576),
    heapUsedMb: Math.round(memory.heapUsed / 1048576),
  };
}
