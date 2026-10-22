#!/usr/bin/env node
/**
 * dev-server.mjs — `next dev` with the Chopper functions mounted.
 *
 * The plain dev server (`npm run dev:site`) only serves the site: `/api/health`
 * answers 404, so the optional "Cloud (CPU)" engine is not mounted and the UI
 * says so. This script — which is what `npm run dev` runs — starts the same
 * Next.js dev server *and* mounts the two Vercel functions on the same
 * origin, which means:
 *
 *   - the cloud engine works at http://127.0.0.1:3000/bg_remove
 *   - the model runs in a local Node process on *this machine's* CPU —
 *     the same code path, the same ONNX Runtime and the same resources it
 *     would use on Vercel (~600–840 MB resident, ~5–8 s per 512×512 image)
 *
 *   node scripts/dev-server.mjs [--port 3000] [--host ::]
 *                               [--dist-dir .next-dev]
 *
 * The dev server keeps its own build directory (`.next-dev`) so it never
 * shares `.next` with `next build`: two processes writing the same directory
 * corrupt it (a build next to a dev server fails with a missing BUILD_ID or
 * broken pages).
 */

import http from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

const port = Number(flag('port', 3000));
// "::" binds dual-stack, so both 127.0.0.1 and ::1 answer. "localhost"
// resolves to ::1 first on most Linux systems, and an IPv4-only bind would
// make the browser fall back — or fail outright.
const host = flag('host', '::');
// Its own build directory, so `next build` and this dev server never fight
// over `.next`.
const distDir = flag('dist-dir', '.next-dev');

// Keep the weights inside the project so a local run reuses them instead of
// downloading ~183 MB into /tmp on every fresh machine.
//
// The handlers are imported *after* this line on purpose: `server/chopperModel.mjs`
// reads CHOPPER_CACHE_DIR once, when it is first evaluated, and a static
// import would evaluate it before the variable is set.
process.env.CHOPPER_CACHE_DIR = process.env.CHOPPER_CACHE_DIR || join(ROOT, '.cache', 'chopper', 'onnx');

// `next.config.mjs` owns the build directory, so the override goes through the
// environment. Passing `conf` to `next()` would *replace* next.config.mjs
// entirely (Next skips loading it when `conf` is set) and silently drop
// `output: 'export'`, `trailingSlash` and `images.unoptimized`.
process.env.NEXT_DIST_DIR = process.env.NEXT_DIST_DIR || distDir;

const { default: bgRemove } = await import('../api/bg-remove.js');
const { default: health } = await import('../api/health.js');

const ROUTES = {
  '/api/bg-remove': bgRemove,
  '/api/health': health,
};

const next = (await import('next')).default;

const app = next({
  dev: true,
  dir: ROOT,
  hostname: host,
  port,
});

const handle = app.getRequestHandler();

await app.prepare();

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  // `trailingSlash: true` makes Next redirect "/api/health" to
  // "/api/health/". The functions are mounted before Next sees the request,
  // so the redirect never happens — but a client that already has the
  // trailing slash must still land on the function.
  const handler = ROUTES[pathname.replace(/\/+$/, '') || '/'];

  if (handler) {
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
    return;
  }

  handle(req, res);
});

server.listen(port, host, () => {
  const origin = host === '::' || host === '0.0.0.0' ? 'localhost' : host;
  console.log(`dev server (site + Chopper functions) on http://${origin}:${port}`);
  console.log(`  GET  http://${origin}:${port}/api/health`);
  console.log(`  GET  http://${origin}:${port}/api/health?warm=1`);
  console.log(`  POST http://${origin}:${port}/api/bg-remove  (raw 512x512x3 RGB)`);
  console.log(`  model cache: ${process.env.CHOPPER_CACHE_DIR}`);
  if (distDir) console.log(`  dist dir: ${distDir}`);
});
