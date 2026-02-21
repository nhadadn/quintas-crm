#!/bin/sh
set -e

if [ -d /directus/extensions ]; then
  for d in /directus/extensions/*; do
    if [ -f "$d/package-lock.json" ]; then
      (cd "$d" && npm ci || npm install)
    elif [ -f "$d/package.json" ]; then
      (cd "$d" && npm install)
    fi
    (cd "$d" 2>/dev/null && npm run build --if-present || true)
    (cd "$d" 2>/dev/null && npm prune --omit=dev || true)
  done
fi

if command -v directus >/dev/null 2>&1; then
  exec directus start
else
  exec npx directus start
fi
