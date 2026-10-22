#!/usr/bin/env node
/**
 * chopper-parity.mjs — prove the cloud engine matches the on-device engine.
 *
 * The browser runs Chopper through `@huggingface/transformers` (the exact
 * same pipeline the site ships). The server runs the same ONNX graph through
 * a hand-written pre/post-processing core (server/chopperModel.mjs).
 *
 * This harness feeds **the same 512x512 RGB buffer** to both and compares
 * the resulting alpha masks pixel by pixel:
 *
 *   reference : transformers.js `background-removal` pipeline (onnxruntime-node)
 *   candidate : server/chopperModel.mjs computeMask()
 *
 * Both engines run in *separate processes*: the site pins onnxruntime-node
 * 1.19.2 (matching the ORT Web build the browser loads) while transformers.js
 * ships its own newer runtime, and two different libonnxruntime builds cannot
 * be loaded into the same process.
 *
 * A run that reports IoU >= 0.995 and mean |diff| <= 1.0 means the cloud
 * engine produces the same cutout as the on-device engine.
 *
 *   node scripts/chopper-parity.mjs [--image public/bgremove/stock/1.jpg]
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_ID = 'studioludens/birefnet-lite-512';
const MODEL_REPO = 'https://huggingface.co/studioludens/birefnet-lite-512/resolve/main';

/** The server core keeps its weights here (see server/chopperModel.mjs). */
const CHOPPER_CACHE = join(ROOT, '.cache', 'chopper', 'onnx');
/** transformers.js resolves local models from `<localModelPath>/<repo>/…`. */
const LOCAL_MODEL_ROOT = join(ROOT, '.cache', 'local');
const OUT_DIR = join(ROOT, '.cache', 'parity');

const INPUT_SIZE = 512;
const MASK_BYTES = INPUT_SIZE * INPUT_SIZE;

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

const MODE = flag('mode', 'compare');
// The default image ships with a hand-cut ground truth
// (public/bgremove/baby-4-cutout.png) so the harness can prove the mask is
// a real segmentation and not an empty/degenerate one.
const IMAGE = flag('image', join(ROOT, 'public', 'bgremove', 'baby-4.jpg'));

/* ------------------------------------------------------------------ */
/* model plumbing                                                     */
/* ------------------------------------------------------------------ */

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ${url} (HTTP ${response.status}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, buffer);
  return buffer;
}

/**
 * Make sure both engines read the *same* weights from disk:
 *  - the server core reads `.cache/chopper/onnx/model.onnx`
 *  - transformers.js reads `.cache/local/<repo>/onnx/model.onnx`
 */
async function ensureLocalWeights() {
  const serverModel = join(CHOPPER_CACHE, 'model.onnx');
  const localDir = join(LOCAL_MODEL_ROOT, MODEL_ID);
  const localModel = join(localDir, 'onnx', 'model.onnx');

  if (!existsSync(localModel)) {
    mkdirSync(join(localDir, 'onnx'), { recursive: true });
    if (existsSync(serverModel)) {
      copyFileSync(serverModel, localModel);
    } else {
      process.stdout.write('Downloading model weights (once)…\n');
      await download(`${MODEL_REPO}/onnx/model.onnx`, localModel);
      copyFileSync(serverModel, serverModel);
    }
  } else if (!existsSync(serverModel)) {
    mkdirSync(CHOPPER_CACHE, { recursive: true });
    copyFileSync(localModel, serverModel);
  }

  for (const file of ['config.json', 'preprocessor_config.json']) {
    const target = join(localDir, file);
    if (!existsSync(target)) {
      await download(`${MODEL_REPO}/${file}`, target);
    }
  }
  return localModel;
}

/** The 512x512 RGB buffer both engines consume. */
async function loadThumbnail() {
  const sharp = (await import('sharp')).default;
  const { data } = await sharp(IMAGE)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}

/* ------------------------------------------------------------------ */
/* engine runners (one per process)                                   */
/* ------------------------------------------------------------------ */

async function runReference(rgb) {
  const { pipeline, env, RawImage } = await import('@huggingface/transformers');
  env.allowLocalModels = true;
  env.localModelPath = LOCAL_MODEL_ROOT;
  env.useFSCache = false;

  const remover = await pipeline('background-removal', MODEL_ID, {
    device: 'cpu',
    dtype: 'fp32',
  });

  const output = await remover(
    new RawImage(new Uint8ClampedArray(rgb), INPUT_SIZE, INPUT_SIZE, 3)
  );

  const mask = new Uint8Array(MASK_BYTES);
  for (let i = 0; i < MASK_BYTES; i += 1) {
    mask[i] = output.data[i * output.channels + 3];
  }
  return mask;
}

async function runCandidate(rgb) {
  const { computeMask } = await import('../server/chopperModel.mjs');
  return computeMask(rgb);
}

/* ------------------------------------------------------------------ */
/* comparison                                                         */
/* ------------------------------------------------------------------ */

function compare(reference, candidate) {
  let maxDiff = 0;
  let sumDiff = 0;
  let differing = 0;
  let intersection = 0;
  let union = 0;
  let referenceForeground = 0;
  let candidateForeground = 0;

  for (let i = 0; i < MASK_BYTES; i += 1) {
    const diff = Math.abs(reference[i] - candidate[i]);
    if (diff > maxDiff) maxDiff = diff;
    sumDiff += diff;
    if (diff > 2) differing += 1;

    const refOn = reference[i] >= 128;
    const candOn = candidate[i] >= 128;
    if (refOn) referenceForeground += 1;
    if (candOn) candidateForeground += 1;
    if (refOn && candOn) intersection += 1;
    if (refOn || candOn) union += 1;
  }

  return {
    maxDiff,
    meanDiff: sumDiff / MASK_BYTES,
    differingPct: (differing / MASK_BYTES) * 100,
    iou: union === 0 ? 1 : intersection / union,
    referenceForeground,
    candidateForeground,
  };
}

/** Alpha channel of a PNG, resized to the model's 512x512 working size. */
async function loadGroundTruth(path) {
  const sharp = (await import('sharp')).default;
  const { data } = await sharp(path)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(MASK_BYTES);
  for (let i = 0; i < MASK_BYTES; i += 1) mask[i] = data[i * 4 + 3];
  return mask;
}

async function writePreview(reference, candidate, name) {
  try {
    const sharp = (await import('sharp')).default;
    mkdirSync(OUT_DIR, { recursive: true });
    const toRgba = (mask) => {
      const rgba = Buffer.alloc(MASK_BYTES * 4);
      for (let i = 0; i < MASK_BYTES; i += 1) {
        rgba[i * 4] = mask[i];
        rgba[i * 4 + 1] = mask[i];
        rgba[i * 4 + 2] = mask[i];
        rgba[i * 4 + 3] = 255;
      }
      return sharp(rgba, { raw: { width: INPUT_SIZE, height: INPUT_SIZE, channels: 4 } });
    };
    await toRgba(reference).png().toFile(join(OUT_DIR, `${name}-reference.png`));
    await toRgba(candidate).png().toFile(join(OUT_DIR, `${name}-candidate.png`));

    const diff = Buffer.alloc(MASK_BYTES * 4);
    for (let i = 0; i < MASK_BYTES; i += 1) {
      const d = Math.min(255, Math.abs(reference[i] - candidate[i]) * 8);
      diff[i * 4] = 255 - d;
      diff[i * 4 + 1] = 255 - d;
      diff[i * 4 + 2] = 255;
      diff[i * 4 + 3] = 255;
    }
    await sharp(diff, { raw: { width: INPUT_SIZE, height: INPUT_SIZE, channels: 4 } })
      .png()
      .toFile(join(OUT_DIR, `${name}-diff.png`));
  } catch (error) {
    console.warn('Could not write preview images:', error.message);
  }
}

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */

function runChild(mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(ROOT, 'scripts', 'chopper-parity.mjs'), '--mode', mode, '--image', IMAGE],
      { stdio: 'inherit', cwd: ROOT }
    );
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${mode} engine exited with code ${code}`));
    });
  });
}

async function main() {
  if (!existsSync(IMAGE)) {
    throw new Error(`Test image not found: ${IMAGE}`);
  }

  process.env.CHOPPER_CACHE_DIR = CHOPPER_CACHE;
  await ensureLocalWeights();

  const name = IMAGE.split('/').pop().replace(/\.[^.]+$/, '');
  mkdirSync(OUT_DIR, { recursive: true });
  const referencePath = join(OUT_DIR, `${name}.reference.bin`);
  const candidatePath = join(OUT_DIR, `${name}.candidate.bin`);

  if (MODE === 'reference' || MODE === 'candidate') {
    const rgb = await loadThumbnail();
    const mask =
      MODE === 'reference' ? await runReference(rgb) : await runCandidate(rgb);
    writeFileSync(MODE === 'reference' ? referencePath : candidatePath, Buffer.from(mask));
    return;
  }

  // Compare mode: run both engines in their own process, then diff the masks.
  process.stdout.write('Running the reference engine (transformers.js)…\n');
  await runChild('reference');
  process.stdout.write('Running the candidate engine (server core)…\n');
  await runChild('candidate');

  const reference = new Uint8Array(readFileSync(referencePath));
  const candidate = new Uint8Array(readFileSync(candidatePath));
  if (reference.length !== MASK_BYTES || candidate.length !== MASK_BYTES) {
    throw new Error('Unexpected mask size produced by one of the engines.');
  }

  const stats = compare(reference, candidate);

  console.log('\n── parity report ─────────────────────────────');
  console.log(`image            : ${IMAGE}`);
  console.log(`model            : ${MODEL_ID} (fp32, ${INPUT_SIZE}x${INPUT_SIZE})`);
  console.log(`mask size        : ${MASK_BYTES} px`);
  console.log(`max |diff|       : ${stats.maxDiff}`);
  console.log(`mean |diff|      : ${stats.meanDiff.toFixed(4)}`);
  console.log(`pixels >2 apart  : ${stats.differingPct.toFixed(3)} %`);
  console.log(`IoU (>=128)      : ${stats.iou.toFixed(6)}`);
  console.log(
    `foreground px    : reference ${stats.referenceForeground} / candidate ${stats.candidateForeground}`
  );

  // A degenerate (empty) mask would make the comparison vacuous, so the
  // harness refuses to pass when neither engine found a subject.
  const degenerate =
    stats.referenceForeground < MASK_BYTES * 0.01 ||
    stats.candidateForeground < MASK_BYTES * 0.01;
  if (degenerate) {
    console.error(
      '\n✗ The model returned an empty mask for this image — the comparison would be vacuous.'
    );
    console.error('  Use an image with a clear subject (e.g. public/bgremove/baby-4.jpg).');
    process.exit(1);
  }

  // Optional: compare against the hand-cut ground truth that ships next to
  // the sample image, which proves the mask is a real segmentation.
  const groundTruth = join(ROOT, 'public', 'bgremove', `${name}-cutout.png`);
  if (existsSync(groundTruth)) {
    const truth = await loadGroundTruth(groundTruth);
    const vsReference = compare(truth, reference);
    const vsCandidate = compare(truth, candidate);
    console.log(
      `ground truth IoU : reference ${vsReference.iou.toFixed(4)} / candidate ${vsCandidate.iou.toFixed(4)}`
    );
  }

  console.log('──────────────────────────────────────────────');

  await writePreview(reference, candidate, name);

  const ok = stats.iou >= 0.995 && stats.meanDiff <= 1.0;
  if (!ok) {
    console.error('\n✗ Parity check FAILED (IoU < 0.995 or mean |diff| > 1.0).');
    process.exit(1);
  }
  console.log('\n✓ Parity check passed — the cloud engine matches the on-device engine.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
