#!/usr/bin/env bash

set -euo pipefail

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy-production.sh"
compose_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/docker-compose.yml"
proxy_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/proxy/Caddyfile.ce"
migration_0126_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/api/plane/db/migrations/0126_spreadsheet_document_types.py"
migration_0127_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/api/plane/db/migrations/0127_spreadsheet_form_view_id.py"
editor_page_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/spreadsheets/[spreadsheetId]/page.tsx"

[[ -f "$script_path" ]]
grep -Fq 'rsync -az --delete' "$script_path"
grep -Fq -- '--exclude .env' "$script_path"
grep -Fq 'docker compose up --build migrator' "$script_path"
grep -Fq 'GRIST_SESSION_SECRET' "$script_path"
grep -Fq 'GRIST_PUBLIC_URL' "$script_path"
grep -Fq 'CADDY_TLS_CERT_FILE' "$script_path"
grep -Fq 'CADDY_TLS_KEY_FILE' "$script_path"
grep -Fq 'tls {$CADDY_TLS_CERT_FILE} {$CADDY_TLS_KEY_FILE}' "$proxy_path"
grep -Fq 'GRIST_INTERNAL_URL' "$script_path"
grep -Fq 'GRIST_WORKSPACE_ID' "$script_path"
grep -Fq 'GRIST_IN_SERVICE: "true"' "$compose_path"
grep -Fq 'GRIST_ADMIN_EMAIL: spreadsheet-system@tenfold.internal' "$compose_path"
grep -Fq 'docker compose pull grist' "$script_path"
grep -Fq 'docker compose up -d --wait grist' "$script_path"
grep -Fq 'api/orgs/current/workspaces' "$script_path"
grep -Fq 'workspace.access === "owners"' "$script_path"
grep -Fq 'body: JSON.stringify({name: "Ten-Fold"})' "$script_path"
grep -Fq 'set_env apps/api/.env GRIST_WORKSPACE_ID "$grist_workspace_id"' "$script_path"
grep -Fq 'docker compose up -d --build --wait grist api worker beat-worker copilot web proxy' "$script_path"
grep -Fq "docker inspect --format '{{json .State.Health}}'" "$script_path"
grep -Fq 'docker compose logs --tail=200 grist' "$script_path"
grep -Fq '178.128.104.112' "$script_path"
grep -Fq "require('http').get('http://localhost:8484/status'" "$compose_path"
grep -Fq 'vars grist_original_uri {uri}' "$proxy_path"
grep -Fq 'header_up X-Ten-Fold-Original-Uri {vars.grist_original_uri}' "$proxy_path"
grep -Fq '@grist_form_preview path_regexp grist_form_preview' "$proxy_path"
grep -Fq '@grist_native_form path_regexp grist_native_form' "$proxy_path"
[[ -f "$migration_0127_path" ]]
grep -Fq 'dependencies = [("db", "0126_spreadsheet_document_types")]' "$migration_0127_path"
grep -Fq 'name="grist_form_view_id"' "$migration_0127_path"
grep -Fq "querySelector('.test-gristdoc')" "$editor_page_path"
if grep -Fq 'data-test-id="gristdoc"' "$editor_page_path"; then
  echo 'Grist exposes editor readiness as .test-gristdoc, not a data-test-id attribute' >&2
  exit 1
fi
if grep -Fq 'name="grist_form_view_id"' "$migration_0126_path"; then
  echo 'Do not modify the already-deployed 0126 migration' >&2
  exit 1
fi
if grep -Fq 'request_header -X-Ten-Fold-User' "$proxy_path"; then
  echo 'Private Grist proxy must not delete the identity copied by forward_auth' >&2
  exit 1
fi
