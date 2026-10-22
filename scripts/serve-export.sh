#!/usr/bin/env bash
#
# Serve the static export (./out) for the headless-render word-count audit.
#
#   ./scripts/serve-export.sh [port]
#
# The render audit loads every route over HTTP so client-side rendered pages
# (/blogs/, /story/, /upscaler/ …) are measured as a visitor sees them.

set -euo pipefail

PORT="${1:-4321}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$ROOT/out" ]; then
  echo "✗ No export found at $ROOT/out — run 'npm run build' first." >&2
  exit 1
fi

echo "Serving $ROOT/out on http://127.0.0.1:$PORT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/out"
