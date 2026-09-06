#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-178.128.104.112}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/plane/app/ten-fold-plane}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/plane-digitalocean}"

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

echo "Rebuilding Plane and CopilotKit services on the Droplet..."
ssh -i "$DEPLOY_SSH_KEY" "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "cd '$DEPLOY_PATH' && docker compose up -d --build api copilot web proxy"

echo "Deployment complete: https://ten-fold.co"
