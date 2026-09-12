#!/usr/bin/env bash

set -euo pipefail

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy-production.sh"
compose_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/docker-compose.yml"

[[ -f "$script_path" ]]
grep -Fq 'rsync -az --delete' "$script_path"
grep -Fq -- '--exclude .env' "$script_path"
grep -Fq 'docker compose up --build migrator' "$script_path"
grep -Fq 'GRIST_SESSION_SECRET' "$script_path"
grep -Fq 'GRIST_PUBLIC_URL' "$script_path"
grep -Fq 'GRIST_INTERNAL_URL' "$script_path"
grep -Fq 'GRIST_WORKSPACE_ID' "$script_path"
grep -Fq 'docker compose pull grist' "$script_path"
grep -Fq 'docker compose up -d --build --wait grist api worker beat-worker copilot web proxy' "$script_path"
grep -Fq "docker inspect --format '{{json .State.Health}}'" "$script_path"
grep -Fq 'docker compose logs --tail=200 grist' "$script_path"
grep -Fq "path:'/api/workspaces/1'" "$script_path"
grep -Fq '178.128.104.112' "$script_path"
grep -Fq "require('http').get('http://localhost:8484/status'" "$compose_path"
