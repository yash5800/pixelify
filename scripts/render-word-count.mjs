#!/usr/bin/env node
/**
 * Word-count audit — RENDERED pages.
 *
 * Some pages (the blog index, /story/, /truckbg/) render their content on the
 * client, so the static HTML is nearly empty even though a visitor sees a
 * full page. This script loads every exported route in headless Chromium,
 * waits for the JS to settle, dumps the resulting DOM and counts the words a
 * visitor actually sees.
 *
 * Requires a static server for the export (scripts/serve-export.sh starts one)
 * and a Chromium binary (Playwright's headless shell is used by default).
 *
 * Usage:
 *   node scripts/render-word-count.mjs
 *   node scripts/render-word-count.mjs --base http://127.0.0.1:4321 --concurrency 6
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { countHtml, classify, sortPages } from './lib/text-count.mjs';

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const OUT_DIR = flag('out', 'out');
const BASE = flag('base', 'http://127.0.0.1:4321').replace(/\/$/, '');
const THRESHOLD = Number(flag('threshold', 1000));
const REPORT_DIR = flag('report', 'reports/word-count');
const CONCURRENCY = Number(flag('concurrency', 6));
const BUDGET = flag('budget', '8000');
const CHROME = flag('chrome', findChrome());

/** Locate a Chromium/headless-shell binary. */
function findChrome() {
  const roots = [
    join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'),
    join(homedir(), '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'),
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const p of roots) if (existsSync(p)) return p;
  // Fall back to globbing the Playwright cache for any version.
  const cache = join(homedir(), '.cache/ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      const p = join(cache, dir, 'chrome-headless-shell-linux64/chrome-headless-shell');
      if (existsSync(p)) return p;
      const p2 = join(cache, dir, 'chrome-linux64/chrome');
      if (existsSync(p2)) return p2;
    }
  }
  return '';
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function routeFor(file, outDir) {
  let rel = relative(outDir, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) rel = '/' + rel.slice(0, -'index.html'.length);
  else rel = '/' + rel.replace(/\.html$/, '');
  return rel === '/404/' ? '/404' : rel;
}

if (!CHROME) {
  console.error('✗ No Chromium binary found. Pass --chrome <path> or install one.');
  process.exit(1);
}
if (!existsSync(OUT_DIR)) {
  console.error(`✗ Export directory not found: ${OUT_DIR}`);
  process.exit(1);
}

const seen = new Set();
const routes = [];
for (const file of walk(OUT_DIR)) {
  const route = routeFor(file, OUT_DIR);
  if (seen.has(route)) continue;
  seen.add(route);
  routes.push(route);
}

/** Load one route in headless Chromium and count the rendered words. */
async function render(route) {
  const url = `${BASE}${route}`;
  const { stdout } = await execFileAsync(
    CHROME,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      // Software WebGL: the home page mounts a three.js canvas, and without a
      // GL context its error unmounts the whole React tree (0 words counted).
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-extensions',
      `--virtual-time-budget=${BUDGET}`,
      '--dump-dom',
      url,
    ],
    { maxBuffer: 64 * 1024 * 1024, timeout: 90_000 },
  );

  const { full, main } = countHtml(stdout);
  const { group, label } = classify(route);
  return {
    route,
    label,
    group,
    renderedTotal: full.total,
    renderedContent: main.total,
    renderedWords: full.words,
    renderedCjk: full.cjk,
  };
}

/** Run tasks with a bounded concurrency pool. */
async function pool(items, limit, worker) {
  const results = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await worker(items[current]);
      } catch (err) {
        results[current] = { route: items[current], error: String(err.message || err) };
      }
      const done = results.filter(Boolean).length;
      process.stdout.write(`\r  rendered ${done}/${items.length}`);
    }
  });
  await Promise.all(runners);
  process.stdout.write('\n');
  return results;
}

console.log(`\nRendering ${routes.length} routes with headless Chromium…`);
const started = Date.now();
const pages = (await pool(routes, CONCURRENCY, render)).filter(Boolean);
const seconds = ((Date.now() - started) / 1000).toFixed(1);

const failed = pages.filter((p) => p.error);
sortPages(pages);

console.log(`\nRendered word audit — ${BASE}  (threshold ${THRESHOLD}, ${seconds}s)\n`);
console.log('ROUTE'.padEnd(48) + 'TOTAL'.padStart(7) + 'CONTENT'.padStart(9) + '   OK');
console.log('─'.repeat(74));

let lastGroup = null;
for (const p of pages) {
  if (p.group !== lastGroup) {
    console.log(`\n[${p.group}]`);
    lastGroup = p.group;
  }
  if (p.error) {
    console.log(p.route.padEnd(48) + '  ERROR: ' + p.error.slice(0, 40));
    continue;
  }
  console.log(
    p.route.padEnd(48) +
      String(p.renderedTotal).padStart(7) +
      String(p.renderedContent).padStart(9) +
      '   ' + (p.renderedTotal >= THRESHOLD ? '✓' : '✗'),
  );
}

const ok = pages.filter((p) => !p.error);
const below = ok.filter((p) => p.renderedTotal < THRESHOLD);
console.log('\n' + '─'.repeat(74));
console.log(`Pages rendered: ${ok.length}/${routes.length}${failed.length ? ` (${failed.length} failed)` : ''}`);
console.log(`≥ ${THRESHOLD} words: ${ok.length - below.length}/${ok.length}`);
if (below.length) {
  console.log(`\nBelow ${THRESHOLD} words:`);
  for (const p of below) console.log(`  ${String(p.renderedTotal).padStart(5)}  ${p.route}`);
}

mkdirSync(REPORT_DIR, { recursive: true });
const jsonPath = join(REPORT_DIR, 'rendered-word-counts.json');
writeFileSync(
  jsonPath,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), base: BASE, threshold: THRESHOLD, pages },
    null,
    2,
  ) + '\n',
);
console.log(`\nJSON → ${jsonPath}`);
