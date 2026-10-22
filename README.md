# Pixelify

Free on-device AI photo editor: image super-resolution (upscaler) and neural background removal, running completely client-side with no backend. Built with **Next.js (App Router)** and deployed as a fully static export.

The Background Remover additionally ships an **optional "Cloud (CPU)" engine**: the same Chopper model, executed on a Vercel serverless function, for devices that cannot run the 183 MB model locally. It is off by default, transmits only a 512×512 thumbnail, and the full-resolution photo never leaves the browser.

## Features

- Next.js App Router with file-based routing and static export
- Drag & drop image upload
- PNG, JPG, WEBP support
- Three upscaler models: Vitality (fast, 4×), Pixel-Dance (balanced, 4×), and Alpha-Satoru (maximum quality, 4×)
- Chopper AI for instant background removal (Web Worker)
- WebGPU/WASM runtime with automatic detection
- Tiled inference for large images
- Side-by-side before/after comparison slider
- SEO: per-page metadata, canonical URLs, hreflang alternates, sitemap & robots routes, JSON-LD
- Download upscaled result as PNG

## Project Structure

```
pixelify/
├── app/                    # Next.js App Router pages (static export)
│   ├── layout.tsx          # Root layout, global SEO metadata, AdSense, structured data
│   ├── page.tsx            # /
│   ├── upscaler/page.tsx   # /upscaler
│   ├── bg_remove/page.tsx  # /bg_remove
│   ├── blogs/page.tsx      # /blogs
│   ├── blogs/[...path]/    # /blogs/<slug> (en) + /blogs/<lang>/<slug>
│   ├── about|products|privacy|terms|story|truckbg/page.tsx
│   ├── not-found.tsx       # 404
│   ├── sitemap.ts          # /sitemap.xml
│   └── robots.ts           # /robots.txt
├── components/             # React UI (home, workspaces, blog, static pages…)
│   ├── AppProvider.tsx     # Global client state (theme, toasts, AI model machinery, jobs)
│   ├── views/              # Route-specific client views
│   ├── blogs/ bgremove/ upscaler/ pages/   # Feature folders
├── hooks/                  # useONNX, useUpscale
├── lib/                    # constants.ts (models/presets), bgUtils, seo
├── types/                  # Shared TypeScript types
├── services/               # bgRemoverService (Web Worker manager), bgRemoverCloudService
├── workers/                # bgRemover.worker.ts
├── utils/                  # upscale.ts, imageProcessing, modelCache, chopperMask, notifications
├── api/                    # Vercel functions (optional cloud engine)
│   ├── bg-remove.js        # POST /api/bg-remove  → 512x512 alpha mask
│   └── health.js           # GET  /api/health[?warm=1]
├── server/                 # chopperModel.mjs (ONNX core), httpBody.mjs (req/resp helpers)
├── scripts/                # chopper-serve / chopper-parity / chopper-bench / prune-onnx-binaries
├── data/posts/             # Blog registry + per-language post files
├── styles/                 # Global CSS (imported by app/layout.tsx)
├── public/
│   ├── models/             # Vitality.onnx, Pixel-Dance.onnx, Alpha-Satoru.onnx
│   └── …                   # Images, fonts, icons
├── next.config.mjs         # output: 'export', trailingSlash
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev        # the site AND the Chopper functions on http://localhost:3000
npm run dev:site   # plain `next dev` (no /api functions)
```

`npm run dev` runs [scripts/dev-server.mjs](scripts/dev-server.mjs): a Next.js dev
server with `/api/health` and `/api/bg-remove` mounted on the same origin, so
the optional "Cloud (CPU)" engine works while you develop **and the model runs
on your own CPU** — the same ONNX Runtime, the same ~600–840 MB resident set and
the same ~5–8 s per 512×512 image that the Vercel function uses.

The server binds `::` (dual-stack), so `http://localhost:3000` works whether
`localhost` resolves to `127.0.0.1` or `::1` — use `--host` to override.

With `npm run dev:site` (or any static host) there is no `/api` route, so the
cloud engine is genuinely absent; the UI says exactly that and the on-device
engine is unaffected.

The dev server keeps its build output in `.next-dev`, never in `.next`, so it
can run next to a build without corrupting it.

## Building

```bash
npm run build        # static export -> out/
npm run build:safe   # same, but safe while a dev server is running
```

Static export ends up in `out/` (prerendered HTML for every route + `/404.html`).

> `next build` and `next dev` share `.next` by default, and two processes
> writing the same directory corrupt it (missing `BUILD_ID`, broken pages).
> `build:safe` builds into `.next-build` and swaps the export into `out/`
> instead, so it can run next to a dev server.

## Models

| Model | Scale | Channels | Size | Speed |
|-------|-------|----------|------|-------|
| Vitality | 4× | RGB | 1.9MB | ~200-400ms |
| Pixel-Dance | 4× | RGB | 66.9MB | ~1-3s/tile |
| Alpha-Satoru | 4× | RGB | 67.1MB | ~1-3s/tile |
| Chopper (BG Remover) | - | RGB | - | Real-time |

## Deployment

The site is deployed on **Vercel** as a static export plus two optional serverless functions. `vercel.json` provides:

- **Framework preset "Other"** (`"framework": null`). The `/api` directory convention is documented for projects *without* a framework, and `framework: null` overrides the preset stored in Project Settings for every deployment, so the dashboard does not have to be reconfigured. The build itself is unchanged — `npm run build` still runs `next build` and produces the same `out/` — and `outputDirectory: "out"` serves it exactly like the Next.js preset did.
- **AdSense-first header strategy:** COOP/COEP are served **only on `/upscaler` and `/bg_remove`**, the two AI tool routes that need `crossOriginIsolated` for multi-threaded WASM SIMD (~2–4× faster WASM fallback). Every other page ships with plain headers, so Google AdSense scripts keep full cookie access and normal ad serving there. Under COEP the ad scripts still load but are cookie-stripped (result: "limited ads" on those two tool pages — accepted tradeoff).
- `Cache-Control: immutable` for `/models/*` so the ~67MB ONNX files are fetched once per client.
- **Function config** for `api/*.js`: 2048 MB / 300 s, plus `includeFiles` for the Linux/x64 ONNX Runtime payload — the native addon is loaded through a dynamic `require`, which the function bundler cannot follow on its own.
- **`ONNXRUNTIME_NODE_INSTALL_CUDA=skip`** for the install step. `onnxruntime-node` would otherwise download ~1 GB of CUDA binaries on Linux/x64 during every build; `scripts/prune-onnx-binaries.mjs` (the project `postinstall`) then removes the binaries of every other platform.

Deploy by connecting the repository in the Vercel dashboard.

Static export output also ends up in `out/` if you ever want to self-host (`output: 'export'` in `next.config.mjs`). Note that the optional cloud engine needs a Node.js runtime, so a purely static self-host does **not** include it — the UI detects the missing endpoint and keeps the on-device engine as the fallback.

## Optional cloud engine (Chopper on the server)

The Background Remover can run the *same* model (`studioludens/birefnet-lite-512`, fp32 ONNX) on a Vercel function instead of on the visitor's device. It is opt-in per session and the on-device engine stays the default.

### Wire contract

| | |
|---|---|
| `POST /api/bg-remove` | request: raw RGB, 512×512×3 = 786 432 bytes (`application/octet-stream`) |
| | response: raw alpha mask, 512×512 = 262 144 bytes (`application/octet-stream`) |
| | 503 `{ "error": "model_warming_up" }` while the weights are still downloading |
| `GET /api/health` | status of the function without loading the model |
| `GET /api/health?warm=1` | loads the model first, then reports the status (deploy gate) |

Both payloads stay far below Vercel's 4.5 MB body cap, and the browser only ever uploads a **512×512 thumbnail** — the mask is scaled back up and composited over the original pixels locally, so the exported cutout keeps the original resolution.

Both endpoints report the same `state` (`idle` → `downloading` → `loading` → `ready`, or `failed`) and a `ready` flag that is only true once the ONNX session actually exists — never while the weights are still on their way.

### Server side

- `server/chopperModel.mjs` — the inference core: ViT normalization, ONNX session (single-flight, one intra-op thread, no memory arena), sigmoid + 0–255 mask conversion, and a model download into `/tmp/chopper` that survives between warm invocations.
- `server/httpBody.mjs` — request/response helpers shared by the functions.
- `api/*.js` — thin `(req, res)` handlers, written against the plain Node HTTP API so they can be mounted locally exactly the way Vercel mounts them.

The native addon is bootstrapped at runtime: `onnxruntime-node` resolves it with a dynamic `require`, so `chopperModel.mjs` locates the `bin/napi-v*/<platform>/<arch>` folder and copies it wherever the loader might look.

### Local tooling

```bash
npm run chopper:serve    # mount the functions on http://127.0.0.1:8787
npm run chopper:parity   # compare the server core against the transformers.js pipeline
npm run chopper:bench    # cold start, latency percentiles, resident memory
npm run preview:cloud    # build the site and serve it *with* the functions on :8787
```

`npm run preview:cloud` is the local equivalent of the deployment: the site and
`/api` are served from one origin, and the model runs in a local Node process on
**your own CPU** — the same code path, the same ONNX Runtime, the same
resources it would use on Vercel (~600–840 MB resident, ~5–8 s per 512×512
image with one thread). `npm run dev:site` (plain `next dev`) serves only the
site, so `/api/health` answers 404 and the UI reports that the cloud engine is
not mounted; the on-device engine is unaffected.

`chopper:parity` runs both engines in separate processes (the site pins `onnxruntime-node` 1.19.2 while Transformers.js ships a newer runtime, and two `libonnxruntime` builds cannot live in one process) and fails unless IoU ≥ 0.995 and mean |diff| ≤ 1.0.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `CHOPPER_CACHE_DIR` | `/tmp/chopper` | where the model weights are cached between invocations |
| `CHOPPER_MODEL_PATH` | `$CHOPPER_CACHE_DIR/model.onnx` | explicit path to the weights |
| `CHOPPER_THREADS` | `1` | intra-op threads (Hobby gives 1 vCPU) |
| `CHOPPER_ARENA` | off | `1` enables the CPU memory arena (~600 MB resident, 0–15 % faster) |
| `CHOPPER_MODEL_WAIT_MS` | `120000` | how long a request may wait for the model before it is answered with 503 `model_warming_up` |

### After deploying

```bash
curl -s https://<your-domain>/api/health | jq          # function is live
curl -s 'https://<your-domain>/api/health?warm=1' | jq # model loads (cold start)
```

The first request on a fresh instance downloads ~183 MB of weights from Hugging Face; the instance caches them in `/tmp` for every later invocation. A request that arrives while that download is still running is answered with **503 `model_warming_up`** (plus `retry-after`) instead of waiting until the platform kills the function — the download keeps going in the background, so the next request finds a warm model. The browser turns that into “the cloud engine is still starting up, try again in a few seconds”.

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WASM | ✅ 57+ | ✅ 52+ | ✅ 11+ | ✅ 79+ |
| WebGPU | ✅ 113+ (HTTPS) | ❌ | ✅ 17+ (HTTPS) | ✅ 113+ (HTTPS) |

**Note:** WebGPU requires HTTPS or localhost.

## Troubleshooting

**Model fails to load**
- Check browser console for errors
- Pixel-Dance and Alpha-Satoru are ~67MB and may take time to download

**Slow inference**
- Enable WebAssembly SIMD
- Use WebGPU (HTTPS only)

**Memory errors**
- Reduce input image size
- Use Vitality model instead of larger models
