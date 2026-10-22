#!/usr/bin/env node
/**
 * Word-count audit — static HTML from the Next.js export in ./out.
 *
 * Counts only what a visitor can see: scripts, styles, SVG and noscript
 * blocks are stripped before counting. Two numbers per page:
 *
 *   total    → every visible word in the document (nav + content + footer)
 *   content  → visible words inside <main> only (the page's own copy)
 *
 * Pages whose content is rendered client-side (e.g. /blogs/) come back
 * near-empty here — run scripts/render-word-count.mjs for the rendered view.
 *
 * Usage:
 *   node scripts/word-count.mjs
 *   node scripts/word-count.mjs --out ./out --threshold 1000
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { countHtml, classify, sortPages, pageKind, isNoindex } from './lib/text-count.mjs';

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const OUT_DIR = flag('out', 'out');
const THRESHOLD = Number(flag('threshold', 1000));
const REPORT_DIR = flag('report', 'reports/word-count');

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

/** out/about/index.html → /about/ ; out/index.html → / ; out/404.html → /404 */
function routeFor(file, outDir) {
  let rel = relative(outDir, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) rel = '/' + rel.slice(0, -'index.html'.length);
  else rel = '/' + rel.replace(/\.html$/, '');
  return rel === '/404/' ? '/404' : rel;
}

if (!existsSync(OUT_DIR)) {
  console.error(`✗ Export directory not found: ${OUT_DIR}\n  Run "npm run build" first.`);
  process.exit(1);
}

const seen = new Set();
const pages = [];

for (const file of walk(OUT_DIR)) {
  const route = routeFor(file, OUT_DIR);
  if (seen.has(route)) continue;
  seen.add(route);

  const html = readFileSync(file, 'utf8');
  const { full, main } = countHtml(html);
  const { group, label } = classify(route);

  pages.push({
    route,
    label,
    group,
    kind: pageKind(route),
    noindex: isNoindex(html),
    staticTotal: full.total,
    staticContent: main.total,
    staticWords: full.words,
    staticCjk: full.cjk,
  });
}

sortPages(pages);

const below = pages.filter((p) => p.staticTotal < THRESHOLD);

console.log(`\nStatic-HTML word audit — ${OUT_DIR}  (threshold ${THRESHOLD})\n`);
console.log(
  'ROUTE'.padEnd(48) + 'TOTAL'.padStart(7) + 'CONTENT'.padStart(9) + '   OK',
);
console.log('─'.repeat(74));

let lastGroup = null;
for (const p of pages) {
  if (p.group !== lastGroup) {
    console.log(`\n[${p.group}]`);
    lastGroup = p.group;
  }
  console.log(
    p.route.padEnd(48) +
      String(p.staticTotal).padStart(7) +
      String(p.staticContent).padStart(9) +
      '   ' + (p.staticTotal >= THRESHOLD ? '✓' : '✗'),
  );
}

console.log('\n' + '─'.repeat(74));
console.log(`Pages: ${pages.length}`);
console.log(`≥ ${THRESHOLD} words: ${pages.length - below.length}/${pages.length}`);
if (below.length) {
  console.log(`\nBelow ${THRESHOLD} words:`);
  for (const p of below) console.log(`  ${String(p.staticTotal).padStart(5)}  ${p.route}`);
}

mkdirSync(REPORT_DIR, { recursive: true });
const jsonPath = join(REPORT_DIR, 'static-word-counts.json');
writeFileSync(
  jsonPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), outDir: OUT_DIR, threshold: THRESHOLD, pages }, null, 2) + '\n',
);
console.log(`\nJSON → ${jsonPath}`);
