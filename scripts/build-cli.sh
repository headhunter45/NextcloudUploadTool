#!/usr/bin/env bash
set -euo pipefail

# Nextcloud Upload Tool — CLI Packaging Helper Script
# Builds release binaries and packages archives for distribution

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist-packages"

echo "==> Building static/optimized release CLI binary..."
cd "${ROOT_DIR}"
cargo build --release -p nut

TARGET_BIN="${ROOT_DIR}/target/release/nut"
VERSION=$(cargo pkgid -p nut | cut -d# -f2 | cut -d: -f2 || echo "0.1.0")
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

mkdir -p "${DIST_DIR}"
ARCHIVE_NAME="nut-v${VERSION}-${OS}-${ARCH}.tar.gz"

echo "==> Creating distribution archive: ${ARCHIVE_NAME}"
TMP_STAGE=$(mktemp -d)
cp "${TARGET_BIN}" "${TMP_STAGE}/nut"
cp "${ROOT_DIR}/README.md" "${TMP_STAGE}/"
cp "${ROOT_DIR}/LICENSE" "${TMP_STAGE}/"

tar -czf "${DIST_DIR}/${ARCHIVE_NAME}" -C "${TMP_STAGE}" .
rm -rf "${TMP_STAGE}"

echo "✓ CLI package created successfully at: ${DIST_DIR}/${ARCHIVE_NAME}"
