#!/usr/bin/env bash
set -euo pipefail

# Nextcloud Upload Tool — Tauri GUI Packaging Helper Script
# Builds production frontend and packages native desktop installer/bundles

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
GUI_DIR="${ROOT_DIR}/gui"

echo "==> Installing and building frontend assets with Yarn Berry..."
cd "${GUI_DIR}"
yarn install --immutable
yarn build

echo "==> Packaging native desktop bundle with Tauri..."
yarn tauri build

echo "✓ Native desktop bundle packaged in: ${GUI_DIR}/src-tauri/target/release/bundle/"
