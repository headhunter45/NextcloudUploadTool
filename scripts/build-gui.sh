#!/usr/bin/env bash
set -euo pipefail

# Nextcloud Upload Tool — Tauri GUI Packaging Helper Script
# Builds production frontend and packages native desktop installer/bundles

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
GUI_DIR="${ROOT_DIR}/gui"

GIT_TAG=$(git -C "${ROOT_DIR}" -c versionsort.suffix=-dev tag --merged HEAD --list 'v*' --sort=-v:refname 2>/dev/null | head -n 1 || true)
if [ -n "${GIT_TAG}" ]; then
  export NUT_VERSION="${GIT_TAG#v}"
  echo "==> Resolved version from git tag: ${NUT_VERSION}"
fi

echo "==> Building frontend assets..."
cd "${GUI_DIR}"
npm run build

echo "==> Packaging native desktop bundle with Tauri..."
npm run tauri build

echo "✓ Native desktop bundle packaged in: ${GUI_DIR}/src-tauri/target/release/bundle/"
