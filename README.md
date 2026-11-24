# Pixelify

Free on-device AI photo editor: image super-resolution (upscaler) and neural background removal, running completely client-side. A small Vercel API handles anonymous page-view and leaderboard records in Supabase. Built with **Next.js (App Router)**.

## Features

- Next.js App Router with file-based pages and Vercel serverless API routes
- Anonymous visitor tracking and community leaderboard (Supabase)
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
├── app/                    # Next.js App Router pages and API routes
│   ├── layout.tsx          # Root layout, global SEO metadata, AdSense, structured data
│   ├── page.tsx            # /
│   ├── upscaler/page.tsx   # /upscaler
│   ├── bg_remove/page.tsx  # /bg_remove
│   ├── blog/page.tsx      # /blog
│   ├── blog/[...path]/    # /blog/<slug> (en) + /blog/<lang>/<slug>
│   ├── about|products|privacy|terms|story|truckbg/page.tsx
│   ├── not-found.tsx       # 404
│   ├── api/                 # Server-side Supabase RPC endpoints
│   ├── leaderboard/page.tsx # Community board
│   ├── sitemap.ts          # /sitemap.xml
│   └── robots.ts           # /robots.txt
├── components/             # React UI (home, workspaces, blog, static pages…)
│   ├── AppProvider.tsx     # Global client state (theme, toasts, AI model machinery, jobs)
│   ├── views/              # Route-specific client views
│   ├── blog/ bgremove/ upscaler/ pages/   # Feature folders
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
├── next.config.mjs         # Next.js and model environment configuration
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

The build produces the Next.js server output required by the Vercel API routes.

## Models

| Model | Scale | Channels | Size | Speed |
|-------|-------|----------|------|-------|
| Vitality | 4× | RGB | 1.9MB | ~200-400ms |
| Pixel-Dance | 4× | RGB | 66.9MB | ~1-3s/tile |
| Alpha-Satoru | 4× | RGB | 67.1MB | ~1-3s/tile |
| Chopper (BG Remover) | - | RGB | - | Real-time |

## Deployment

The site is deployed on **Vercel**. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) as server-only Vercel environment variables, then apply the SQL migrations in `supabase/migrations` in order. Never expose the service key as a `NEXT_PUBLIC_*` variable.

Set `VISITOR_IP_HASH_SECRET` to a stable random secret for server-side HMAC visitor counting (for example, generate one with `openssl rand -hex 32`). If it is unset, the server uses the Supabase service key as the HMAC key. Rotating the HMAC key starts a new network-counting bucket. Only the keyed hash is stored for aggregate visitor counts; browser IDs continue to identify profiles and points.

`vercel.json` provides:

- **AdSense-first header strategy:** COOP/COEP are served **only on `/upscaler` and `/bg_remove`**, the two AI tool routes that need `crossOriginIsolated` for multi-threaded WASM SIMD (~2–4× faster WASM fallback). Every other page ships with plain headers, so Google AdSense scripts keep full cookie access and normal ad serving there. Under COEP the ad scripts still load but are cookie-stripped (result: "limited ads" on those two tool pages - accepted tradeoff).
- `Cache-Control: immutable` for `/models/*` so the ~67MB ONNX files are fetched once per client.

Deploy by connecting the repository in the Vercel dashboard (framework preset: Next.js); the server-only Supabase environment variables and migration above are required for visitor and leaderboard data.

The visitor and leaderboard API requires a server runtime and is not available from a static-only export.

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

## Contributors

- [@yash5800](https://github.com/yash5800) - Creator & Lead Developer
- [@Bskn1412](https://github.com/Bskn1412) - Contributor
- **[Antigravity](https://deepmind.google)** (Google DeepMind) - AI Assistant & Contributor
- **[OpenCode](https://opencode.ai/)** - AI Contributor
- **[Codex](https://openai.com)** (OpenAI) - AI Contributor

