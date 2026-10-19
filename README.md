# Pixelify

Free on-device AI photo editor: image super-resolution (upscaler) and neural background removal, running completely client-side with no backend. Built with **Next.js (App Router)** and deployed as a fully static export.

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
├── services/               # bgRemoverService (Web Worker manager)
├── workers/                # bgRemover.worker.ts
├── utils/                  # upscale.ts, imageProcessing, modelCache, notifications
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
npm run dev
```

Open http://localhost:3000

## Building

```bash
npm run build
```

Static export ends up in `out/` (prerendered HTML for every route + `/404.html`).

## Models

| Model | Scale | Channels | Size | Speed |
|-------|-------|----------|------|-------|
| Vitality | 4× | RGB | 1.9MB | ~200-400ms |
| Pixel-Dance | 4× | RGB | 66.9MB | ~1-3s/tile |
| Alpha-Satoru | 4× | RGB | 67.1MB | ~1-3s/tile |
| Chopper (BG Remover) | - | RGB | - | Real-time |

## Deployment

The site is deployed on **Vercel** as a fully static export. `vercel.json` provides:

- **AdSense-first header strategy:** COOP/COEP are served **only on `/upscaler` and `/bg_remove`**, the two AI tool routes that need `crossOriginIsolated` for multi-threaded WASM SIMD (~2–4× faster WASM fallback). Every other page ships with plain headers, so Google AdSense scripts keep full cookie access and normal ad serving there. Under COEP the ad scripts still load but are cookie-stripped (result: "limited ads" on those two tool pages — accepted tradeoff).
- `Cache-Control: immutable` for `/models/*` so the ~67MB ONNX files are fetched once per client.

Deploy by connecting the repository in the Vercel dashboard (framework preset: Next.js). No other settings required.

Static export output also ends up in `out/` if you ever want to self-host (`output: 'export'` in `next.config.mjs`).

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
