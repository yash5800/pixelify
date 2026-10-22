#!/usr/bin/env node
/**
 * prune-onnx-binaries.mjs — slim down the ONNX Runtime native payload.
 *
 * `onnxruntime-node` ships the native runtime for every platform
 * (~180 MB unpacked) and its postinstall downloads another ~1 GB of CUDA
 * binaries on Linux/x64. The cloud engine only ever needs the runtime of the
 * machine it runs on, so this script removes everything else:
 *
 *   - the binaries of other platforms (darwin, win32, other linux arches),
 *   - the CUDA execution-provider libraries.
 *
 * It runs as the project's own `postinstall`, i.e. after the dependency's
 * postinstall, and only ever keeps the payload of the *current* platform —
 * so a macOS or Windows checkout keeps working.
 *
 * The CUDA download itself is skipped upstream with
 * `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` (see vercel.json); this script is the
 * second line of defence that also removes a CUDA payload that is already on
 * disk.
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGE = 'onnxruntime-node';

/**
 * Every installed copy of the package, not just the top-level one.
 *
 * `@huggingface/transformers` pulls in its own `onnxruntime-node` (1.24.x,
 * which uses the napi-v6 folder) nested under its own node_modules. That
 * copy carries the full multi-platform payload (~180 MB) and is not touched
 * by a top-level-only prune — it would inflate the deployment for nothing,
 * since no function imports it.
 */
function packageDirs() {
  const roots = [
    new URL('../node_modules/', import.meta.url).pathname,
    new URL('../node_modules/@huggingface/transformers/node_modules/', import.meta.url)
      .pathname,
  ];
  const found = [];
  for (const root of roots) {
    const dir = join(root, PACKAGE);
    if (existsSync(join(dir, 'package.json'))) found.push(dir);
  }
  return found;
}

function dirSizeMb(dir) {
  let total = 0;
  const walk = (current) => {
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        try {
          total += statSync(full).size;
        } catch {
          /* ignore */
        }
      }
    }
  };
  walk(dir);
  return Math.round((total / 1048576) * 10) / 10;
}

function main() {
  const platform = process.platform;
  const arch = process.arch;
  const dirs = packageDirs();

  if (dirs.length === 0) {
    console.log(`[prune-onnx] ${PACKAGE} is not installed — nothing to prune.`);
    return;
  }

  for (const root of dirs) {
    const binRoot = join(root, 'bin');
    if (!existsSync(binRoot)) {
      console.log(`[prune-onnx] no native payload found in ${root} — skipping.`);
      continue;
    }

    const before = dirSizeMb(binRoot);

    // The N-API major version differs between onnxruntime-node releases, so
    // every bin/napi-v* folder is scanned.
    for (const napiDir of readdirSync(binRoot)) {
      const napiPath = join(binRoot, napiDir);
      if (!statSync(napiPath).isDirectory()) continue;

      for (const osDir of readdirSync(napiPath)) {
        const osPath = join(napiPath, osDir);
        if (!statSync(osPath).isDirectory()) continue;

        if (osDir !== platform) {
          rmSync(osPath, { recursive: true, force: true });
          console.log(`[prune-onnx] removed ${osDir} binaries (${napiDir}).`);
          continue;
        }

        for (const archDir of readdirSync(osPath)) {
          const archPath = join(osPath, archDir);
          if (!statSync(archPath).isDirectory()) continue;

          if (archDir !== arch) {
            rmSync(archPath, { recursive: true, force: true });
            console.log(`[prune-onnx] removed ${osDir}/${archDir} binaries (${napiDir}).`);
            continue;
          }

          // Keep the CPU runtime, drop the CUDA execution provider.
          for (const file of readdirSync(archPath)) {
            if (file.includes('cuda') || file.includes('providers_cuda')) {
              rmSync(join(archPath, file), { force: true });
              console.log(`[prune-onnx] removed ${osDir}/${archDir}/${file}.`);
            }
          }
        }
      }
    }

    const after = dirSizeMb(binRoot);
    console.log(
      `[prune-onnx] native payload for ${platform}/${arch} in ${root}: ${before} MB → ${after} MB.`
    );
  }
}

try {
  main();
} catch (error) {
  // This runs as `postinstall`. A failure here aborts the whole install —
  // and with it the deployment — so a pruning hiccup must never be fatal.
  // The CUDA download is already skipped upstream (ONNXRUNTIME_NODE_INSTALL_CUDA=skip),
  // so the worst case is a bigger deployment, not a broken one.
  console.warn(
    `[prune-onnx] skipped: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(0);
}
