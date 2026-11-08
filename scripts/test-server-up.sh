#!/usr/bin/env bash
set -euo pipefail

# Nextcloud Upload Tool — Ephemeral Nextcloud Integration Test Server Launcher
# Supports Docker Compose (`docker compose` / `docker-compose`) and Podman Compose
# (`podman compose` / `podman-compose`).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.test.yml"
ENV_FILE="${ROOT_DIR}/.nextcloud-test.env"

export NEXTCLOUD_TEST_PORT="${NEXTCLOUD_TEST_PORT:-8088}"
export NEXTCLOUD_TEST_USER="${NEXTCLOUD_TEST_USER:-admin}"
export NEXTCLOUD_TEST_PASS="${NEXTCLOUD_TEST_PASS:-AdminTestPass!2026}"
export NEXTCLOUD_TEST_CONTAINER="${NEXTCLOUD_TEST_CONTAINER:-nut-nextcloud-test}"
export NEXTCLOUD_TEST_URL="http://127.0.0.1:${NEXTCLOUD_TEST_PORT}"

detect_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    RUNTIME_CMD=(docker)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    RUNTIME_CMD=(docker)
  elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(podman compose)
    RUNTIME_CMD=(podman)
  elif command -v podman-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(podman-compose)
    RUNTIME_CMD=(podman)
  else
    echo "Error: Neither Docker Compose nor Podman Compose was found on PATH." >&2
    exit 1
  fi
}

detect_compose

echo "==> Starting ephemeral Nextcloud test server (${COMPOSE_CMD[*]})..."
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for Nextcloud initialization at ${NEXTCLOUD_TEST_URL}/status.php ..."
MAX_WAIT=180
ELAPSED=0
while true; do
  STATUS_JSON="$(curl -fsSL "${NEXTCLOUD_TEST_URL}/status.php" 2>/dev/null || true)"
  if echo "${STATUS_JSON}" | grep -q '"installed":true' && echo "${STATUS_JSON}" | grep -q '"maintenance":false'; then
    echo "✓ Nextcloud is installed and ready: ${STATUS_JSON}"
    break
  fi

  if [ "${ELAPSED}" -ge "${MAX_WAIT}" ]; then
    echo "Error: Timed out after ${MAX_WAIT}s waiting for Nextcloud container to initialize." >&2
    "${RUNTIME_CMD[@]}" logs "${NEXTCLOUD_TEST_CONTAINER}" | tail -n 50 >&2 || true
    exit 1
  fi

  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

run_occ() {
  "${RUNTIME_CMD[@]}" exec -u www-data "${NEXTCLOUD_TEST_CONTAINER}" php occ "$@"
}

echo "==> Configuring Nextcloud test settings (disabling password expiration & brute-force throttling)..."
run_occ app:disable password_policy >/dev/null 2>&1 || true
run_occ config:system:set auth.bruteforce.protection.enabled --value=false --type=boolean >/dev/null 2>&1 || true
run_occ config:system:set ratelimit.protection.enabled --value=false --type=boolean >/dev/null 2>&1 || true
run_occ config:app:set core shareapi_allow_links --value="yes" >/dev/null 2>&1 || true
run_occ config:app:set files_sharing public_link_enforced_password --value="no" >/dev/null 2>&1 || true

echo "==> Provisioning dedicated Nextcloud app password for '${NEXTCLOUD_TEST_USER}'..."
APP_PASS_RESPONSE="$(curl -fsSL \
  -u "${NEXTCLOUD_TEST_USER}:${NEXTCLOUD_TEST_PASS}" \
  -H "OCS-APIRequest: true" \
  -H "Accept: application/json" \
  -H "User-Agent: NextcloudUploadTool-IntegrationTest/0.1.0" \
  "${NEXTCLOUD_TEST_URL}/ocs/v2.php/core/getapppassword?format=json" 2>/dev/null || true)"

APP_PASSWORD="$(python3 -c '
import json, sys
try:
    data = json.loads(sys.argv[1])
    print(data["ocs"]["data"]["apppassword"])
except Exception:
    print("")
' "${APP_PASS_RESPONSE}")"

if [ -z "${APP_PASSWORD}" ]; then
  echo "    (OCS getapppassword not returned; using admin password directly as token)"
  APP_PASSWORD="${NEXTCLOUD_TEST_PASS}"
else
  echo "✓ Generated dedicated app password token via OCS API"
fi

cat > "${ENV_FILE}" <<EOF
export NEXTCLOUD_TEST_URL="${NEXTCLOUD_TEST_URL}"
export NEXTCLOUD_TEST_USER="${NEXTCLOUD_TEST_USER}"
export NEXTCLOUD_TEST_PASS="${NEXTCLOUD_TEST_PASS}"
export NEXTCLOUD_TEST_APP_PASSWORD="${APP_PASSWORD}"
export NEXTCLOUD_TEST_CONTAINER="${NEXTCLOUD_TEST_CONTAINER}"
EOF

echo "✓ Connection metadata written to ${ENV_FILE}"
echo "  Run: source .nextcloud-test.env && cargo test --test cli_integration"

