#!/usr/bin/env node
/**
 * Build the word-count report: merges the static-HTML and rendered audits
 * into one self-contained HTML page with an interactive bar chart.
 *
 * Usage:
 *   node scripts/build-report.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pageKind } from './lib/text-count.mjs';

const REPORT_DIR = 'reports/word-count';
const THRESHOLD = 1000;

const staticPath = join(REPORT_DIR, 'static-word-counts.json');
const renderedPath = join(REPORT_DIR, 'rendered-word-counts.json');

if (!existsSync(staticPath)) {
  console.error(`✗ Missing ${staticPath} — run scripts/word-count.mjs first.`);
  process.exit(1);
}

const staticData = JSON.parse(readFileSync(staticPath, 'utf8'));
const renderedData = existsSync(renderedPath)
  ? JSON.parse(readFileSync(renderedPath, 'utf8'))
  : { pages: [] };

const renderedByRoute = new Map(renderedData.pages.map((p) => [p.route, p]));

const pages = staticData.pages.map((p) => {
  const r = renderedByRoute.get(p.route);
  return {
    route: p.route,
    label: p.label,
    group: p.group,
    kind: p.kind || pageKind(p.route),
    noindex: !!p.noindex,
    rendered: r && !r.error ? r.renderedTotal : null,
    renderedContent: r && !r.error ? r.renderedContent : null,
    staticTotal: p.staticTotal,
    staticContent: p.staticContent,
  };
});

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GROUP_ORDER = [
  'Main pages', 'Blog indexes',
  'Blog posts (en)', 'Blog posts (fr)', 'Blog posts (zh)',
  'Blog posts (ja)', 'Blog posts (hi)', 'Blog posts (ru)',
];
const groupRank = (g) => {
  const i = GROUP_ORDER.indexOf(g);
  return i === -1 ? 99 : i;
};
pages.sort((a, b) => {
  const d = groupRank(a.group) - groupRank(b.group);
  if (d !== 0) return d;
  return (b.rendered ?? b.staticTotal) - (a.rendered ?? a.staticTotal);
});

/* ------------------------------------------------------------------ */
/* Chart geometry                                                     */
/* ------------------------------------------------------------------ */

const ROW_H = 23;
const BAR_H = 13;
const LEFT = 330;   // route label gutter
const RIGHT = 78;   // value label gutter
const WIDTH = 1160;

function buildChart(metric) {
  // metric: 'rendered' | 'static'
  const valueOf = (p) => (metric === 'rendered' ? (p.rendered ?? p.staticTotal) : p.staticTotal);
  const rows = pages.map((p) => ({ ...p, value: valueOf(p) }));
  const maxValue = Math.max(...rows.map((r) => r.value), THRESHOLD);
  const scaleMax = Math.ceil((maxValue * 1.08) / 250) * 250;
  const plotW = WIDTH - LEFT - RIGHT;
  const x = (v) => LEFT + (v / scaleMax) * plotW;

  let y = 26;
  const parts = [];

  // Group headings
  let lastGroup = null;
  for (const r of rows) {
    if (r.group !== lastGroup) {
      parts.push(
        `<text x="0" y="${y + 4}" class="group">${esc(r.group)}</text>`,
      );
      lastGroup = r.group;
      y += 22;
      r.y = y;
    } else {
      r.y = y;
    }
    y += ROW_H;
  }
  const height = y + 16;

  // Grid lines + axis labels
  const ticks = [];
  const tickStep = scaleMax > 6000 ? 1000 : scaleMax > 3000 ? 500 : scaleMax > 1500 ? 250 : 100;
  for (let t = 0; t <= scaleMax; t += tickStep) {
    ticks.push(
      `<line x1="${x(t).toFixed(1)}" y1="14" x2="${x(t).toFixed(1)}" y2="${height - 10}" class="grid"/>`,
      `<text x="${x(t).toFixed(1)}" y="${height}" class="axis">${t.toLocaleString()}</text>`,
    );
  }

  // Threshold line
  const thX = x(THRESHOLD);
  parts.push(
    `<line x1="${thX.toFixed(1)}" y1="10" x2="${thX.toFixed(1)}" y2="${height - 10}" class="threshold"/>`,
    `<text x="${(thX + 6).toFixed(1)}" y="20" class="threshold-label">${THRESHOLD.toLocaleString()} words</text>`,
  );

  // Bars
  const bars = rows.map((r) => {
    const w = Math.max(2, x(r.value) - LEFT);
    const ok = r.value >= THRESHOLD;
    const util = r.kind !== 'article' || r.noindex;
    const cls = util ? 'bar util' : ok ? 'bar ok' : 'bar bad';
    const vcls = util ? 'v-util' : ok ? 'v-ok' : 'v-bad';
    const detail =
      metric === 'rendered'
        ? `rendered ${r.rendered?.toLocaleString() ?? 'n/a'} · static HTML ${r.staticTotal.toLocaleString()}`
        : `static HTML ${r.staticTotal.toLocaleString()} · rendered ${r.rendered?.toLocaleString() ?? 'n/a'}`;
    return (
      `<g class="row" data-route="${esc(r.route)}" data-value="${r.value}" data-detail="${esc(detail)}">` +
      `<title>${esc(r.route)} — ${r.value.toLocaleString()} words (${detail})</title>` +
      `<rect x="${LEFT}" y="${r.y}" width="${w.toFixed(1)}" height="${BAR_H}" rx="3" class="${cls}"/>` +
      `<text x="${LEFT - 10}" y="${r.y + BAR_H - 2}" class="label" text-anchor="end">${esc(r.route)}</text>` +
      `<text x="${(LEFT + w + 8).toFixed(1)}" y="${r.y + BAR_H - 2}" class="value ${vcls}">${r.value.toLocaleString()}</text>` +
      `</g>`
    );
  });

  return {
    svg:
      `<svg viewBox="0 0 ${WIDTH} ${height}" width="100%" height="${height}" role="img" aria-label="Words per page">` +
      ticks.join('') +
      parts.join('') +
      bars.join('') +
      `</svg>`,
    height,
    scaleMax,
  };
}

const chartRendered = buildChart('rendered');
const chartStatic = buildChart('static');

/* ------------------------------------------------------------------ */
/* Summary stats                                                      */
/* ------------------------------------------------------------------ */

const withRendered = pages.filter((p) => p.rendered !== null);
const value = (p) => p.rendered ?? p.staticTotal;

const articles = withRendered.filter((p) => p.kind === 'article' && !p.noindex);
const listings = withRendered.filter((p) => p.kind === 'listing' && !p.noindex);
const utilities = withRendered.filter((p) => p.kind === 'utility' || p.noindex);

const passRendered = articles.filter((p) => p.rendered >= THRESHOLD);
const failRendered = articles.filter((p) => p.rendered < THRESHOLD);
const failListings = listings.filter((p) => p.rendered < THRESHOLD);
const failUtilities = utilities.filter((p) => p.rendered < THRESHOLD);
const passStatic = pages.filter((p) => p.staticTotal >= THRESHOLD);
const failStatic = pages.filter((p) => p.staticTotal < THRESHOLD);
const mainPages = pages.filter((p) => p.group === 'Main pages');
const mainFail = mainPages.filter((p) => p.kind === 'article' && !p.noindex && value(p) < THRESHOLD);

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

const renderedValues = withRendered.map((p) => p.rendered);

/* Distribution histogram (rendered) */
const BUCKETS = [0, 500, 1000, 1500, 2000, 3000, 4000, 5000, Infinity];
const bucketLabels = ['<500', '500–999', '1000–1.5k', '1.5k–2k', '2k–3k', '3k–4k', '4k–5k', '5k+'];
const hist = new Array(BUCKETS.length - 1).fill(0);
for (const v of renderedValues) {
  for (let i = 0; i < BUCKETS.length - 1; i++) {
    if (v >= BUCKETS[i] && v < BUCKETS[i + 1]) { hist[i]++; break; }
  }
}
const maxHist = Math.max(...hist, 1);

/* ------------------------------------------------------------------ */
/* Table rows                                                         */
/* ------------------------------------------------------------------ */

const tableRows = pages
  .map((p) => {
    const rv = p.rendered;
    const util = p.kind !== 'article' || p.noindex;
    const ok = util || (rv ?? p.staticTotal) >= THRESHOLD;
    return (
      `<tr class="${ok ? '' : 'fail'}">` +
      `<td class="route"><a href="#${esc(p.route)}">${esc(p.route)}</a><span class="sub">${esc(p.group)}${p.noindex ? ' · noindex' : ''}</span></td>` +
      `<td class="num ${ok ? '' : 'bad'}">${rv === null ? '—' : rv.toLocaleString()}</td>` +
      `<td class="num">${p.renderedContent === null ? '—' : p.renderedContent.toLocaleString()}</td>` +
      `<td class="num">${p.staticTotal.toLocaleString()}</td>` +
      `<td class="num">${p.staticContent.toLocaleString()}</td>` +
      `<td class="status">${util ? '<span class="pill util">n/a</span>' : ok ? '<span class="pill ok">pass</span>' : '<span class="pill bad">short</span>'}</td>` +
      `</tr>`
    );
  })
  .join('');

/* ------------------------------------------------------------------ */
/* HTML                                                               */
/* ------------------------------------------------------------------ */

const generated = new Date().toISOString().slice(0, 16).replace('T', ' ');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Word count audit — Pixelify</title>
<style>
  :root{
    --bg:#08080b; --panel:#101017; --panel-2:#16161f; --line:#23232f;
    --text:#f2f2f5; --muted:#8b8b9a; --accent:#A4D441; --bad:#ff5c5c;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);
    font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;}
  .wrap{max-width:1240px;margin:0 auto;padding:40px 24px 80px}
  h1{font-size:34px;letter-spacing:-.02em;margin:0 0 6px}
  .sub{color:var(--muted);margin:0 0 28px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:32px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
  .card .k{font:600 11px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .card .v{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:8px}
  .card .d{font-size:12px;color:var(--muted);margin-top:4px}
  .v-ok{color:var(--accent)} .v-bad{color:var(--bad)}
  h2{font-size:19px;letter-spacing:-.01em;margin:36px 0 14px}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px}
  .tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
  .tab{background:var(--panel-2);border:1px solid var(--line);color:var(--muted);
    padding:8px 14px;border-radius:999px;font:600 12px/1 var(--mono);cursor:pointer}
  .tab.active{background:var(--accent);border-color:var(--accent);color:#0b0b0d}
  .chartbox{max-height:720px;overflow:auto;border-radius:12px}
  svg{display:block;min-width:900px}
  .grid{stroke:#1c1c26;stroke-width:1}
  .axis{fill:#6b6b7a;font:11px var(--mono);text-anchor:middle}
  .group{fill:var(--accent);font:700 11px var(--mono);letter-spacing:.16em;text-transform:uppercase}
  .label{fill:#b9b9c6;font:12px var(--mono)}
  .value{font:700 11px var(--mono)}
  .v-ok{fill:var(--accent)} .v-bad{fill:var(--bad)}
  .bar{transition:opacity .12s}
  .bar.ok{fill:var(--accent)}
  .bar.bad{fill:var(--bad)}
  .bar.util{fill:#4a4a5a}
  .row:hover .bar{opacity:.75}
  .v-util{fill:#6b6b7a}
  .threshold{stroke:var(--bad);stroke-width:1.5;stroke-dasharray:5 4;opacity:.85}
  .threshold-label{fill:var(--bad);font:700 11px var(--mono)}
  .legend{display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:12px;
    font:12px var(--mono);color:var(--muted)}
  .legend span{display:flex;align-items:center;gap:7px}
  .sw{width:14px;height:9px;border-radius:2px;display:inline-block}
  .sw.ok{background:var(--accent)} .sw.bad{background:var(--bad)} .sw.util{background:#4a4a5a}
  .sw.th{background:transparent;border-top:2px dashed var(--bad);height:0;border-radius:0}
  table{width:100%;border-collapse:collapse;font:13px var(--mono)}
  th{text-align:left;color:var(--muted);font-weight:600;padding:9px 10px;border-bottom:1px solid var(--line);
    position:sticky;top:0;background:var(--panel);text-transform:uppercase;font-size:10.5px;letter-spacing:.1em}
  td{padding:9px 10px;border-bottom:1px solid #191922;vertical-align:top}
  td.num{text-align:right;white-space:nowrap}
  td.route a{color:var(--text);text-decoration:none;border-bottom:1px solid var(--line)}
  td.route a:hover{color:var(--accent);border-color:var(--accent)}
  td.route .sub{display:block;color:var(--muted);font-size:10.5px;margin-top:2px}
  tr.fail td.route a{color:var(--bad)}
  .pill{font:700 10px var(--mono);padding:2px 8px;border-radius:999px;letter-spacing:.06em}
  .pill.ok{background:rgba(164,212,65,.14);color:var(--accent)}
  .pill.bad{background:rgba(255,92,92,.14);color:var(--bad)}
  .pill.util{background:rgba(140,140,160,.14);color:#9a9aab}
  .mutedtag{background:rgba(140,140,160,.09);border:1px solid rgba(140,140,160,.28);color:#9a9aab;
    border-radius:8px;padding:5px 10px;font:12px var(--mono)}
  .muted-fails{margin-top:10px}
  .fails strong{width:100%;font:600 12px var(--mono);color:var(--muted);letter-spacing:.06em;
    text-transform:uppercase;margin-bottom:2px}
  .hist{display:flex;align-items:flex-end;gap:10px;height:150px;padding-top:8px}
  .hist .b{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;height:100%}
  .hist .bar2{width:100%;background:linear-gradient(180deg,var(--accent),#6f9229);border-radius:6px 6px 0 0;min-height:3px}
  .hist .bar2.low{background:linear-gradient(180deg,var(--bad),#8c2f2f)}
  .hist .lb{font:10px var(--mono);color:var(--muted);white-space:nowrap}
  .hist .n{font:700 11px var(--mono);color:var(--text)}
  .note{color:var(--muted);font-size:13px;margin-top:12px}
  code{background:var(--panel-2);border:1px solid var(--line);border-radius:5px;padding:1px 6px;font:12px var(--mono)}
  .fails{margin-top:14px;display:flex;flex-wrap:wrap;gap:8px}
  .failtag{background:rgba(255,92,92,.09);border:1px solid rgba(255,92,92,.3);color:#ffb3b3;
    border-radius:8px;padding:5px 10px;font:12px var(--mono)}
  .hidden{display:none}
</style>
</head>
<body>
<div class="wrap">
  <h1>Word count audit</h1>
  <p class="sub">Every route in the static export, counted from the rendered DOM · generated ${esc(generated)}</p>

  <div class="cards">
    <div class="card"><div class="k">Routes audited</div><div class="v">${pages.length}</div>
      <div class="d">${withRendered.length} rendered in Chromium</div></div>
    <div class="card"><div class="k">Content pages ≥ ${THRESHOLD}</div><div class="v v-ok">${passRendered.length}/${articles.length}</div>
      <div class="d">${Math.round((passRendered.length / articles.length) * 100)}% of articles</div></div>
    <div class="card"><div class="k">Content pages short</div><div class="v ${failRendered.length ? 'v-bad' : 'v-ok'}">${failRendered.length}</div>
      <div class="d">${failListings.length} listing · ${failUtilities.length} noindex</div></div>
    <div class="card"><div class="k">Median words</div><div class="v">${median(renderedValues).toLocaleString()}</div>
      <div class="d">mean ${avg(renderedValues).toLocaleString()}</div></div>
    <div class="card"><div class="k">Site pages short</div><div class="v ${mainFail.length ? 'v-bad' : 'v-ok'}">${mainFail.length}</div>
      <div class="d">of ${mainPages.filter((p) => p.kind === 'article' && !p.noindex).length} main content routes</div></div>
  </div>

  <h2>Words per page</h2>
  <div class="tabs">
    <button class="tab active" data-metric="rendered">Rendered (what visitors see)</button>
    <button class="tab" data-metric="static">Static HTML (no JS)</button>
  </div>
  <div class="panel">
    <div class="legend">
      <span><i class="sw ok"></i>≥ ${THRESHOLD.toLocaleString()} words</span>
      <span><i class="sw bad"></i>&lt; ${THRESHOLD.toLocaleString()} words</span>
      <span><i class="sw util"></i>listing / noindex (not judged)</span>
      <span><i class="sw th"></i>${THRESHOLD.toLocaleString()}-word line</span>
    </div>
    <div class="chartbox">
      <div id="chart-rendered">${chartRendered.svg}</div>
      <div id="chart-static" class="hidden">${chartStatic.svg}</div>
    </div>
    <p class="note">Routes are grouped by section. Switch tabs to compare the rendered DOM against the no-JavaScript HTML that non-JS crawlers receive.</p>
    ${
      failRendered.length
        ? `<div class="fails"><strong>Content pages short of ${THRESHOLD.toLocaleString()} words:</strong>${failRendered
            .map((p) => `<span class="failtag">${esc(p.route)} — ${p.rendered.toLocaleString()}</span>`)
            .join('')}</div>`
        : '<div class="fails"><strong>Every content page clears the line.</strong></div>'
    }
    ${
      failListings.length || failUtilities.length
        ? `<div class="fails muted-fails"><strong>Not judged (by design):</strong>${[...failListings, ...failUtilities]
            .map((p) => `<span class="mutedtag">${esc(p.route)} — ${p.rendered.toLocaleString()}</span>`)
            .join('')}</div>`
        : ''
    }
  </div>

  <h2>Distribution</h2>
  <div class="panel">
    <div class="hist">
      ${hist
        .map(
          (n, i) => `<div class="b">
            <div class="n">${n}</div>
            <div class="bar2 ${i === 0 || i === 1 ? 'low' : ''}" style="height:${(n / maxHist) * 100}%"></div>
            <div class="lb">${bucketLabels[i]}</div>
          </div>`,
        )
        .join('')}
    </div>
    <p class="note">Rendered word counts bucketed. The first two buckets (under 1,000 words) are highlighted red.</p>
  </div>

  <h2>All routes</h2>
  <div class="panel" style="padding:0;overflow:auto;max-height:640px">
    <table>
      <thead><tr>
        <th>Route</th><th style="text-align:right">Rendered</th><th style="text-align:right">Rendered &lt;main&gt;</th>
        <th style="text-align:right">Static total</th><th style="text-align:right">Static &lt;main&gt;</th><th>Status</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <p class="note">
    Method: pages are served from the static export and loaded in headless Chromium; the DOM is dumped after the
    JavaScript settles, then <code>&lt;script&gt;</code>, <code>&lt;style&gt;</code>, <code>&lt;svg&gt;</code> and
    <code>&lt;noscript&gt;</code> blocks are stripped before counting. Chinese and Japanese characters are counted
    one per character, since those scripts do not separate words with spaces.
  </p>
  <p class="note">
    Reproduce: <code>npm run build</code> → <code>node scripts/word-count.mjs</code> →
    <code>node scripts/render-word-count.mjs</code> → <code>node scripts/build-report.mjs</code>
  </p>
</div>
<script>
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(o => o.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('chart-rendered').classList.toggle('hidden', t.dataset.metric !== 'rendered');
    document.getElementById('chart-static').classList.toggle('hidden', t.dataset.metric !== 'static');
  }));
</script>
</body>
</html>
`;

mkdirSync(REPORT_DIR, { recursive: true });
const outPath = join(REPORT_DIR, 'index.html');
writeFileSync(outPath, html);

console.log(`\nReport → ${outPath}`);
console.log(`  routes: ${pages.length}  content pages: ${articles.length}`);
console.log(`  content pages ≥ ${THRESHOLD}: ${passRendered.length}  short: ${failRendered.length}`);
console.log(`  listing/noindex not judged: ${listings.length + utilities.length}`);
console.log(`  main content routes short: ${mainFail.length ? mainFail.map((p) => `${p.route} (${value(p)})`).join(', ') : 'none'}`);
