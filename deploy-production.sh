#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-178.128.104.112}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/plane/app/ten-fold-plane}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/plane-digitalocean}"
PRODUCTION_URL="${PRODUCTION_URL:-https://ten-fold.co}"

if [[ ! -f "$DEPLOY_SSH_KEY" ]]; then
  echo "SSH key not found: $DEPLOY_SSH_KEY" >&2
  echo "Set DEPLOY_SSH_KEY to the path of your DigitalOcean private key." >&2
  exit 1
fi

echo "Uploading Ten-Fold to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}..."
rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude .env \
  --exclude .env.local \
  --exclude .next \
  -e "ssh -i $DEPLOY_SSH_KEY" \
  "$REPOSITORY_ROOT/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "Rebuilding and migrating Plane on the Droplet..."
ssh -i "$DEPLOY_SSH_KEY" "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "DEPLOY_PATH='$DEPLOY_PATH' PRODUCTION_URL='$PRODUCTION_URL' bash -s" <<'REMOTE'
set -euo pipefail
cd "$DEPLOY_PATH"

[[ -f .env && -f apps/api/.env ]] || {
  echo "Missing preserved production .env files in $DEPLOY_PATH" >&2
  exit 1
}

set_env() {
  local file="$1" key="$2" value="$3"
  sed -i "/^${key}=/d" "$file"
  printf '%s="%s"\n' "$key" "$value" >> "$file"
}

grist_session_secret="$(sed -n 's/^GRIST_SESSION_SECRET=//p' .env | tail -1 | tr -d '"')"
if [[ -z "$grist_session_secret" ]]; then
  set_env .env GRIST_SESSION_SECRET "$(openssl rand -hex 32)"
fi
set_env .env GRIST_PUBLIC_URL "$PRODUCTION_URL/grist"
set_env apps/api/.env GRIST_INTERNAL_URL "http://grist:8484"
set_env apps/api/.env GRIST_WORKSPACE_ID "1"
set_env apps/api/.env GRIST_PUBLIC_BASE_PATH "/grist"

docker compose pull grist
docker compose up --build migrator
docker compose up -d --build --wait grist api worker beat-worker copilot web proxy
REMOTE

echo "Deployment complete: $PRODUCTION_URL"
