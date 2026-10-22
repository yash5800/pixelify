#!/usr/bin/env node
/**
 * chopper-serve.mjs — mount the Vercel functions on a local HTTP server.
 *
 * The functions in `api/` are plain `(req, res)` handlers, so they can be
 * served by Vercel *and* by this script with the exact same code path.
 * That makes it possible to smoke-test the real deployment target locally:
 *
 *   node scripts/chopper-serve.mjs --port 8787
 *   curl -s localhost:8787/api/health | jq
 *   curl -s --data-binary @thumb.rgb -H 'content-type: application/octet-stream' \
 *        localhost:8787/api/bg-remove --output mask.bin
 *
 * With `--static <dir>` the static export is served from the same origin, so
 * the browser can drive the whole cloud-engine flow (the client calls
 * `/api/bg-remove` relative to the site):
 *
 *   npm run build
 *   node scripts/chopper-serve.mjs --port 8788 --static out
 *   open http://127.0.0.1:8788/bg_remove/
 */

import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Keep the weights inside the project so a local run reuses them instead of
// downloading ~183 MB into /tmp on every fresh machine.
//
// The handlers are imported *after* this line on purpose: `server/chopperModel.mjs`
// reads CHOPPER_CACHE_DIR once, when it is first evaluated, and a static
// import would evaluate it before the variable is set.
process.env.CHOPPER_CACHE_DIR = process.env.CHOPPER_CACHE_DIR || join(ROOT, '.cache', 'chopper', 'onnx');

const { default: bgRemove } = await import('../api/bg-remove.js');
const { default: health } = await import('../api/health.js');

const ROUTES = {
  '/api/bg-remove': bgRemove,
  '/api/health': health,
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.onnx': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

const port = Number(flag('port', 8787));
const host = flag('host', '127.0.0.1');
const staticDir = flag('static', null);

/** Serve a file from the static export, mirroring Vercel's static rules. */
function serveStatic(req, res, pathname) {
  const root = normalize(staticDir);
  let relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  let filePath = normalize(join(root, relative));

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath)) {
    const notFound = join(root, '404.html');
    if (existsSync(notFound)) {
      const body = statSync(notFound).size;
      res.writeHead(404, {
        'content-type': 'text/html; charset=utf-8',
        'content-length': body,
      });
      createReadStream(notFound).pipe(res);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const stats = statSync(filePath);
  const type = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'content-length': stats.size });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  // Accept the trailing-slash variant too: `next.config.mjs` sets
  // `trailingSlash: true`, so a browser can ask for "/api/health/".
  const handler = ROUTES[pathname.replace(/\/+$/, '') || '/'];

  if (!handler) {
    if (staticDir) {
      serveStatic(req, res, pathname);
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found', path: pathname }));
    return;
  }

  try {
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
    }
    res.end(
      JSON.stringify({
        error: 'unhandled',
        message: error instanceof Error ? error.message : String(error),
      })
    );
  }
});

server.listen(port, host, () => {
  console.log(`chopper functions mounted on http://${host}:${port}`);
  console.log(`  GET  http://${host}:${port}/api/health`);
  console.log(`  GET  http://${host}:${port}/api/health?warm=1`);
  console.log(`  POST http://${host}:${port}/api/bg-remove  (raw 512x512x3 RGB)`);
  if (staticDir) {
    console.log(`  static export: ${staticDir} -> http://${host}:${port}/`);
  }
});
