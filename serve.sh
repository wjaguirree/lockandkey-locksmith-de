#!/usr/bin/env bash
# Serve this static site on localhost for local preview.
# Usage: ./serve.sh [port]   (default 8090)
set -euo pipefail
PORT="${1:-8090}"
cd "$(dirname "$0")"
echo "Serving lockandkey-locksmith-de at http://localhost:${PORT}"
exec python3 -m http.server "$PORT"
