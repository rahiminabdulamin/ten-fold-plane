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
set_env apps/api/.env GRIST_PUBLIC_BASE_PATH "/grist"

docker compose pull grist
docker compose up -d --wait grist
grist_workspace_id="$(docker compose exec -T grist node --input-type=module <<'NODE'
const headers = {
  "X-Ten-Fold-User": "spreadsheet-system@tenfold.internal",
  "X-Requested-With": "XMLHttpRequest",
};
const base = "http://localhost:8484/api/orgs/current/workspaces";
const response = await fetch(base, {headers});
if (!response.ok) throw new Error(`Workspace discovery HTTP ${response.status}: ${await response.text()}`);
const workspaces = await response.json();
if (workspaces.length) {
  console.log(workspaces[0].id);
} else {
  const created = await fetch(base, {
    method: "POST",
    headers: {...headers, "Content-Type": "application/json"},
    body: JSON.stringify({name: "Ten-Fold"}),
  });
  if (!created.ok) throw new Error(`Workspace creation HTTP ${created.status}: ${await created.text()}`);
  const result = await created.json();
  console.log(typeof result === "object" ? result.id : result);
}
NODE
)"
[[ "$grist_workspace_id" =~ ^[0-9]+$ ]] || {
  echo "Grist returned an invalid workspace ID: $grist_workspace_id" >&2
  exit 1
}
set_env apps/api/.env GRIST_WORKSPACE_ID "$grist_workspace_id"

docker compose up --build migrator
if ! docker compose up -d --build --wait grist api worker beat-worker copilot web proxy; then
  docker compose ps
  grist_container_id="$(docker compose ps -q grist)"
  if [[ -n "$grist_container_id" ]]; then
    docker inspect --format '{{json .State.Health}}' "$grist_container_id"
  fi
  docker compose logs --tail=200 grist
  exit 1
fi
REMOTE

echo "Deployment complete: $PRODUCTION_URL"
