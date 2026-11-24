import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../node_modules/@litertjs/core/wasm');
const destDir = path.resolve(__dirname, '../public/litert/wasm');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  // Copy the matching WASM runtimes locally so model startup does not depend
  // on a separate, unobservable remote binary download.
  const entries = fs.readdirSync(srcDir);
  for (const entry of entries) {
    const srcFile = path.join(srcDir, entry);
    const destFile = path.join(destDir, entry);
    // Refresh JS loaders as well as WASM binaries. A stale checked-in loader
    // can retain an older remote Hugging Face fallback even when the worker
    // asks LiteRT to load the same-origin runtime.
    fs.copyFileSync(srcFile, destFile);
    console.log(`[copy-litert] Copied ${entry} to public/litert/wasm`);
  }
  console.log('[copy-litert] Verified LiteRT JS loaders and WASM runtimes in public/litert/wasm');
} else {
  console.warn('[copy-litert] Warning: source directory not found at', srcDir);
}
