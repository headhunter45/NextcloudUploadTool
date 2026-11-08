#!/usr/bin/env bash
set -euo pipefail

# Nextcloud Upload Tool — End-to-End Integration Test Runner
# Spins up the containerized Nextcloud test server, executes the Rust integration
# test suite against it, and tears down the container on exit.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cleanup() {
  echo "==> Tearing down Nextcloud test container..."
  "${SCRIPT_DIR}/test-server-down.sh" || true
}
trap cleanup EXIT

"${SCRIPT_DIR}/test-server-up.sh"

# shellcheck disable=SC1091
source "${ROOT_DIR}/.nextcloud-test.env"

echo "==> Running Rust CLI integration tests against ${NEXTCLOUD_TEST_URL}..."
cd "${ROOT_DIR}"
cargo test --test cli_integration -- --nocapture

