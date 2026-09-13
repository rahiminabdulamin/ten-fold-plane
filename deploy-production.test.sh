#!/usr/bin/env bash

set -euo pipefail

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy-production.sh"
compose_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/docker-compose.yml"
proxy_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/proxy/Caddyfile.ce"
migration_0126_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/api/plane/db/migrations/0126_spreadsheet_document_types.py"
migration_0127_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/api/plane/db/migrations/0127_spreadsheet_form_view_id.py"
editor_page_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/spreadsheets/[spreadsheetId]/page.tsx"
grist_css_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apps/proxy/grist-custom.css"

[[ -f "$script_path" ]]
grep -Fq 'rsync -az --delete' "$script_path"
grep -Fq -- '--exclude .env' "$script_path"
grep -Fq 'docker compose run --rm --build migrator' "$script_path"
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
grep -Fq 'docker compose up -d --wait --force-recreate grist' "$script_path"
grep -Fq 'api/orgs/current/workspaces' "$script_path"
grep -Fq 'workspace.access === "owners"' "$script_path"
grep -Fq 'body: JSON.stringify({name: "Ten-Fold"})' "$script_path"
grep -Fq 'set_env apps/api/.env GRIST_WORKSPACE_ID "$grist_workspace_id"' "$script_path"
grep -Fq 'docker compose up -d --build --wait grist api worker beat-worker copilot web admin space live proxy' "$script_path"
grep -Fq "docker inspect --format '{{json .State.Health}}'" "$script_path"
grep -Fq 'docker compose logs --tail=100 grist api worker beat-worker copilot web admin space live proxy' "$script_path"
grep -Fq '178.128.104.112' "$script_path"
grep -Fq "require('http').get('http://localhost:8484/status'" "$compose_path"
grep -Fq 'vars grist_original_uri {uri}' "$proxy_path"
grep -Fq 'header_up X-Ten-Fold-Original-Uri {vars.grist_original_uri}' "$proxy_path"
grep -Fq '@grist_form_preview path_regexp grist_form_preview' "$proxy_path"
grep -Fq '@grist_native_form path_regexp grist_native_form' "$proxy_path"
grep -Fq '@grist_shared_api path /o/ten-fold/api/s/*' "$proxy_path"
grep -Fq '@grist_custom_css path /grist/v/*/custom.css' "$proxy_path"
grep -Fq 'header_down Cache-Control "no-store, max-age=0"' "$proxy_path"
grep -Fq '@grist_favicon path /grist/favicon*' "$proxy_path"
grep -Fq 'rewrite * /branding/tenfold-logo-square-rebrand-black-v4.png' "$proxy_path"
grep -Fq '.test-form-page > .test-form-framing {' "$grist_css_path"
grep -Fq 'background-color: #fff !important;' "$grist_css_path"
grep -Fq '.test-form-page > footer > * {' "$grist_css_path"
grep -Fq '.test-form-page > footer {' "$grist_css_path"
grep -Fq 'background-color: #000 !important;' "$grist_css_path"
grep -Fq 'handle /grist/form-base.css {' "$proxy_path"
grep -Fq 'rewrite * /api/v1/internal/grist/form-branding/' "$proxy_path"
[[ -f "$migration_0127_path" ]]
grep -Fq 'dependencies = [("db", "0126_spreadsheet_document_types")]' "$migration_0127_path"
grep -Fq 'name="grist_form_view_id"' "$migration_0127_path"
grep -Fq '.test-gristdoc' "$editor_page_path"
grep -Fq '[data-grist-region-id="left"]' "$grist_css_path"
grep -Fq 'button[aria-label="Open navigation panel (left panel)"]' "$grist_css_path"
grep -Fq 'button[aria-label="Close navigation panel (left panel)"]' "$grist_css_path"
grep -Fq -- '--grist-theme-font-family: "Inter Variable"' "$grist_css_path"
grep -Fq -- '--grist-theme-bg-default: var(--tenfold-surface-1)' "$grist_css_path"
grep -Fq -- '--grist-theme-control-primary-bg: var(--tenfold-accent)' "$grist_css_path"
grep -Fq -- '--grist-theme-menu-item-selected-bg: var(--tenfold-accent-subtle)' "$grist_css_path"
grep -Fq -- '--weaseljs-selected-background-color: var(--tenfold-accent-subtle)' "$grist_css_path"
grep -Fq -- '--weaseljs-selected-color: var(--tenfold-text-primary)' "$grist_css_path"
grep -Fq -- '--grist-theme-table-header-bg: var(--tenfold-layer-1)' "$grist_css_path"
grep -Fq -- '--grist-theme-input-focus: var(--tenfold-accent)' "$grist_css_path"
grep -Fq -- '--grist-theme-modal-bg: var(--tenfold-surface-1)' "$grist_css_path"
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

# Execute the real remote body with mocked external commands. No SSH, containers,
# or public requests are used; environment writes stay inside this temporary tree.
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT
mkdir -p "$test_root/apps/api" "$test_root/apps/proxy"
touch "$test_root/.env" "$test_root/apps/api/.env" "$test_root/apps/proxy/grist-custom.css"
export DEPLOY_PATH="$test_root" PRODUCTION_URL="https://deployment.test"
export DEPLOY_SOURCE_SHA="test-source"
# Extract only the quoted remote heredoc, not the local rsync/SSH wrapper.
remote_body="$(sed -n "/<<'REMOTE'$/,/^REMOTE$/p" "$script_path" | sed '1d;$d')"
# Use the production transport command itself, so reverting its stdin isolation
# also breaks this regression test rather than only changing an untested wrapper.
eval "$(sed -n '/^printf -v deploy_command /p' "$script_path")"

docker() {
  printf '%s\n' "$*" >> "$DEPLOY_PATH/commands"
  # Compose can consume stdin even without -i; emulate that behavior. Deployment
  # commands must not share stdin with the script Bash is still reading.
  if [[ "$*" != "compose exec -T grist node --input-type=module" ]]; then
    cat >/dev/null
  fi
  case "$*" in
    "compose run --rm --build migrator") return "${MIGRATION_EXIT:-0}" ;;
    "compose exec -T grist sha256sum /grist/static/custom.css")
      sha256sum "$DEPLOY_PATH/apps/proxy/grist-custom.css" ;;
    "compose exec -T grist node --input-type=module") cat >/dev/null; printf '1\n' ;;
    "compose exec -T web cat /usr/share/caddy/html/index.html")
      printf '<script src="/assets/manifest-current.js"></script>' ;;
    "compose exec -T web cat /usr/share/caddy/html/deployment-source.txt")
      printf '%s' "${IMAGE_SOURCE:-test-source}" ;;
    *) return 0 ;;
  esac
}
curl() {
  if [[ "${PUBLIC_STATE:-current}" == "unreachable" ]]; then return 22; fi
  if [[ "${*: -1}" == */grist/form-base.css ]]; then
    case "${CSS_STATE:-current}" in
      missing) return 22 ;;
      html) printf '<!doctype html><title>Not found</title>' ;;
      stale) printf 'body { color: green; }' ;;
      *) cat "$DEPLOY_PATH/apps/proxy/grist-custom.css" ;;
    esac
    return
  fi
  printf '<script src="/assets/manifest-%s.js"></script>' "${PUBLIC_STATE:-current}"
}
export -f docker curl

run_remote_case() {
  local scenario="$1" migration_exit="$2" public_state="$3" expected_exit="$4"
  : > "$test_root/commands"
  local actual_exit=0
  printf '%s\n' "$remote_body" | MIGRATION_EXIT="$migration_exit" PUBLIC_STATE="$public_state" bash -c "$deploy_command" > "$test_root/result" 2>&1 || actual_exit=$?
  [[ "$actual_exit" == "$expected_exit" ]] || {
    echo "FAIL: $scenario (exit $actual_exit, expected $expected_exit)" >&2
    cat "$test_root/result" >&2
    exit 1
  }
  echo "PASS: $scenario"
}

run_remote_case "successful deployment verifies matching manifest" 0 current 0
grep -Fq 'Verified public frontend: manifest-current.js' "$test_root/result"
grep -Fq 'compose up -d --build --wait grist api worker beat-worker copilot web admin space live proxy' "$test_root/commands"
run_remote_case "migration failure stops before app replacement" 7 current 7
if grep -Fq 'compose up -d --build' "$test_root/commands"; then
  echo "Apps were replaced after migration failure" >&2
  exit 1
fi
run_remote_case "stale public frontend rejects deployment" 0 stale 1
grep -Fq 'Frontend verification failed' "$test_root/result"
run_remote_case "unreachable public frontend rejects deployment" 0 unreachable 22
export IMAGE_SOURCE="old-source"
run_remote_case "matching public and container manifests cannot hide stale source" 0 current 1
grep -Fq 'Running web image does not match uploaded source' "$test_root/result"
unset IMAGE_SOURCE

export CSS_STATE=missing
run_remote_case "missing public form CSS rejects deployment" 0 current 22
export CSS_STATE=html
run_remote_case "HTML in place of form CSS rejects deployment" 0 current 1
export CSS_STATE=stale
run_remote_case "stale public form CSS rejects deployment" 0 current 1
unset CSS_STATE

# Run actual local preflight against this checkout. Stub rsync so the test
# deliberately ends before any upload or SSH, even when a real key is present.
rsync() { return 73; }
export -f rsync
preflight_exit=0
DEPLOY_SSH_KEY="$test_root/.env" bash "$script_path" > "$test_root/preflight" 2>&1 || preflight_exit=$?
[[ "$preflight_exit" == 73 ]] || {
  cat "$test_root/preflight" >&2
  echo "FAIL: local checksum preflight did not reach the upload boundary" >&2
  exit 1
}
grep -Fq 'Source fingerprint:' "$test_root/preflight"
echo "PASS: real-checkout checksum preflight handles directory symlinks"
