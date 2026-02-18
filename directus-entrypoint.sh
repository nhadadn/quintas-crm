#!/bin/sh
set -e

if [ -d /directus/extensions ]; then
  for d in /directus/extensions/*; do
    if [ -f "$d/package.json" ]; then
      (cd "$d" && npm install || true)
    fi
  done
fi

if command -v directus >/dev/null 2>&1; then
  directus bootstrap || true
  exec directus start
else
  npx directus bootstrap || true
  exec npx directus start
fi
