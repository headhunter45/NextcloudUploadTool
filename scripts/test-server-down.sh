#!/usr/bin/env bash
set -euo pipefail

# Nextcloud Upload Tool — Ephemeral Nextcloud Integration Test Server Teardown
# Cleanly stops and disposes of the test container, volumes, and env file.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.test.yml"
ENV_FILE="${ROOT_DIR}/.nextcloud-test.env"

export NEXTCLOUD_TEST_CONTAINER="${NEXTCLOUD_TEST_CONTAINER:-nut-nextcloud-test}"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(podman compose)
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(podman-compose)
else
  echo "Error: Neither Docker Compose nor Podman Compose was found on PATH." >&2
  exit 1
fi

echo "==> Stopping and removing Nextcloud integration test container and volumes..."
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" down -v --remove-orphans || true

rm -f "${ENV_FILE}"
echo "✓ Nextcloud test environment cleaned up."

