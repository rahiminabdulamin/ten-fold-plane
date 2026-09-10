#!/usr/bin/env bash

set -euo pipefail

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy-production.sh"

[[ -f "$script_path" ]]
grep -Fq 'rsync -az --delete' "$script_path"
grep -Fq -- '--exclude .env' "$script_path"
grep -Fq 'docker compose up --build migrator' "$script_path"
grep -Fq 'docker compose up -d --build api copilot web proxy' "$script_path"
grep -Fq '178.128.104.112' "$script_path"
