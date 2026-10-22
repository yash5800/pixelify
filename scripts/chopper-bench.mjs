#!/usr/bin/env node
/**
 * chopper-bench.mjs — measure the server-side cost of the cloud engine.
 *
 * Reports the numbers that decide whether the optional "Cloud (CPU)" engine
 * is usable on a small serverless instance (Vercel Hobby: 1 vCPU / 2 GB):
 *
 *   - cold start  : ONNX session creation (weights already on disk)
 *   - warm latency: per-image inference, median / p95
 *   - memory      : resident set before and after the model is loaded
 *   - payload     : bytes the browser uploads and downloads
 *
 *   node scripts/chopper-bench.mjs [--runs 5] [--image public/bgremove/stock/1.jpg]
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

const RUNS = Number(flag('runs', 5));
const IMAGE = flag('image', join(ROOT, 'public', 'bgremove', 'baby-4.jpg'));
const CHOPPER_CACHE = join(ROOT, '.cache', 'chopper', 'onnx');

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

const mb = (bytes) => (bytes / 1048576).toFixed(1);

async function main() {
  if (!existsSync(IMAGE)) throw new Error(`Test image not found: ${IMAGE}`);

  process.env.CHOPPER_CACHE_DIR = CHOPPER_CACHE;

  const sharp = (await import('sharp')).default;
  const { data: rgb } = await sharp(IMAGE)
    .resize(512, 512, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rssBefore = process.memoryUsage().rss;

  const { computeMask, getSession, getStatus } = await import('../server/chopperModel.mjs');

  const coldStart = Date.now();
  await getSession();
  const coldMs = Date.now() - coldStart;
  const rssAfterLoad = process.memoryUsage().rss;

  const samples = [];
  for (let i = 0; i < RUNS; i += 1) {
    const startedAt = Date.now();
    await computeMask(new Uint8Array(rgb));
    samples.push(Date.now() - startedAt);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const rssPeak = process.memoryUsage().rss;

  const status = getStatus();

  console.log('\n── chopper benchmark ──────────────────────────');
  console.log(`image                : ${IMAGE}`);
  console.log(`runs                 : ${RUNS}`);
  console.log(`cold start (session) : ${coldMs} ms`);
  console.log(`inference min        : ${sorted[0]} ms`);
  console.log(`inference median     : ${percentile(sorted, 50)} ms`);
  console.log(`inference p95        : ${percentile(sorted, 95)} ms`);
  console.log(`inference max        : ${sorted[sorted.length - 1]} ms`);
  console.log(`rss before / loaded  : ${mb(rssBefore)} MB / ${mb(rssAfterLoad)} MB`);
  console.log(`rss peak             : ${mb(rssPeak)} MB`);
  console.log(`threads              : ${status.threads}`);
  console.log(`onnxruntime version  : ${status.ortVersion || 'unknown'}`);
  console.log('── wire payload ───────────────────────────────');
  console.log(`upload (512x512 RGB) : ${rgb.length} bytes (${mb(rgb.length)} MB)`);
  console.log(`download (512x512 a) : ${512 * 512} bytes (${mb(512 * 512)} MB)`);
  console.log('──────────────────────────────────────────────');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
