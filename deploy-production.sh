#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-178.128.104.112}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/plane/app/ten-fold-plane}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/plane-digitalocean}"
PRODUCTION_URL="${PRODUCTION_URL:-https://ten-fold.co}"
deployment_stage="local preflight"
trap 'echo "Deployment failed during $deployment_stage (line $LINENO)." >&2' ERR

# This is a local-checkout uploader, not a git-pull command for the droplet.
source_checksums="$(mktemp)"
trap 'rm -f -- "$source_checksums"' EXIT
(
  cd "$REPOSITORY_ROOT"
  git ls-files -z -- apps packages pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc .gitignore .dockerignore .oxfmtrc.json .oxlintrc.json docker-compose.yml |
    while IFS= read -r -d '' source_file; do
      # Directory aliases (such as i18n/locales -> src/locales) are transferred
      # by rsync; their tracked target files are hashed under their real paths.
      if [[ -L "$source_file" && -d "$source_file" ]]; then continue; fi
      sha256sum "$source_file"
    done
) > "$source_checksums"
DEPLOY_SOURCE_SHA="$(sha256sum "$source_checksums" | cut -d ' ' -f 1)"
echo "Deploying checkout: $REPOSITORY_ROOT"
echo "Checkout commit: $(git -C "$REPOSITORY_ROOT" rev-parse --short HEAD)"
echo "Source fingerprint: $DEPLOY_SOURCE_SHA"

if [[ ! -f "$DEPLOY_SSH_KEY" ]]; then
  echo "SSH key not found: $DEPLOY_SSH_KEY" >&2
  echo "Set DEPLOY_SSH_KEY to the path of your DigitalOcean private key." >&2
  exit 1
fi

echo "Uploading Ten-Fold to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}..."
deployment_stage="source upload"
rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude .env \
  --exclude .env.local \
  --exclude .next \
  --exclude build \
  --exclude dist \
  --exclude out \
  --exclude .turbo \
  --exclude .react-router \
  -e "ssh -i $DEPLOY_SSH_KEY" \
  "$REPOSITORY_ROOT/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

deployment_stage="uploaded source verification"
printf -v verify_command 'cd %q && sha256sum --check --status' "$DEPLOY_PATH"
ssh -i "$DEPLOY_SSH_KEY" "${DEPLOY_USER}@${DEPLOY_HOST}" "$verify_command" < "$source_checksums"
echo "Uploaded source matches local checkout."

echo "Rebuilding and migrating Plane on the Droplet..."
deployment_stage="remote build and deployment"
# Read the script from fd 3. Docker must never inherit the SSH script as stdin,
# or it can consume the remaining commands and make Bash report false success.
printf -v deploy_command 'DEPLOY_PATH=%q PRODUCTION_URL=%q DEPLOY_SOURCE_SHA=%q bash /dev/fd/3 3<&0 </dev/null' "$DEPLOY_PATH" "$PRODUCTION_URL" "$DEPLOY_SOURCE_SHA"
ssh -i "$DEPLOY_SSH_KEY" "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "$deploy_command" <<'REMOTE'
set -euo pipefail
deployment_stage="remote preflight"
trap 'echo "Deployment failed during $deployment_stage (line $LINENO)." >&2' ERR
export DEPLOY_SOURCE_SHA
cd "$DEPLOY_PATH"
command -v curl >/dev/null || {
  echo "curl is required on the deployment host to verify the public frontend." >&2
  exit 1
}

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
set_env .env GRIST_PUBLIC_ORIGIN "$PRODUCTION_URL"
set_env .env CADDY_TLS_DIRECTORY "/etc/tenfold/tls"
set_env .env CADDY_TLS_CERT_FILE "/etc/caddy/tls/origin.pem"
set_env .env CADDY_TLS_KEY_FILE "/etc/caddy/tls/origin.key"
set_env apps/api/.env GRIST_INTERNAL_URL "http://grist:8484"
set_env apps/api/.env GRIST_PUBLIC_BASE_PATH "/o/ten-fold"

deployment_stage="Grist setup"
docker compose pull grist
# rsync replaces files atomically; recreate Grist to refresh its single-file CSS mount.
docker compose up -d --wait --force-recreate grist
grist_css_expected="$(sha256sum apps/proxy/grist-custom.css | cut -d ' ' -f 1)"
grist_css_actual="$(docker compose exec -T grist sha256sum /grist/static/custom.css | cut -d ' ' -f 1)"
[[ "$grist_css_actual" == "$grist_css_expected" ]] || {
  echo "Grist is using stale custom CSS; deployment stopped." >&2
  exit 1
}
grist_workspace_id="$(docker compose exec -T grist node --input-type=module <<'NODE'
const headers = {
  "X-Ten-Fold-User": "spreadsheet-system@tenfold.internal",
  "X-Requested-With": "XMLHttpRequest",
};
const base = "http://localhost:8484/api/orgs/current/workspaces";
const response = await fetch(base, {headers});
if (!response.ok) throw new Error(`Workspace discovery HTTP ${response.status}: ${await response.text()}`);
const workspaces = await response.json();
const ownedWorkspace = workspaces.find((workspace) => workspace.access === "owners");
if (ownedWorkspace) {
  console.log(ownedWorkspace.id);
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

deployment_stage="database migrations"
docker compose run --rm --build migrator
deployment_stage="application build and replacement"
if ! docker compose up -d --build --wait grist api worker beat-worker copilot web admin space live proxy; then
  docker compose ps
  grist_container_id="$(docker compose ps -q grist)"
  if [[ -n "$grist_container_id" ]]; then
    docker inspect --format '{{json .State.Health}}' "$grist_container_id"
  fi
  docker compose logs --tail=100 grist api worker beat-worker copilot web admin space live proxy
  exit 1
fi

deployment_stage="frontend source verification"
image_source="$(docker compose exec -T web cat /usr/share/caddy/html/deployment-source.txt)"
[[ "$image_source" == "$DEPLOY_SOURCE_SHA" ]] || {
  echo "Running web image does not match uploaded source: expected=$DEPLOY_SOURCE_SHA actual=$image_source" >&2
  exit 1
}

# Read the built artifact, then verify normal public HTML advertises that build.
# Do not cache-bust the request: a stale edge-cached homepage must fail this check.
manifest_pattern='manifest-[A-Za-z0-9_-]+\.js'
web_html="$(docker compose exec -T web cat /usr/share/caddy/html/index.html)"
expected_manifest="$(printf '%s' "$web_html" | grep -oE "$manifest_pattern" | sort -u || true)"
[[ -n "$expected_manifest" && "$expected_manifest" != *$'\n'* ]] || {
  echo "Unable to identify a single frontend manifest in the web container." >&2
  exit 1
}
public_html="$(curl --fail --silent --show-error --location --connect-timeout 10 --max-time 30 "${PRODUCTION_URL%/}/")"
public_manifest="$(printf '%s' "$public_html" | grep -oE "$manifest_pattern" | sort -u || true)"
[[ "$public_manifest" == "$expected_manifest" ]] || {
  echo "Frontend verification failed: container=$expected_manifest public=${public_manifest:-missing}" >&2
  echo "Inspect the public proxy/cache and running web image before declaring deployment complete." >&2
  exit 1
}
echo "Verified public frontend: $expected_manifest"
deployment_stage="public form stylesheet verification"
public_css_hash="$(curl --fail --silent --show-error --location --connect-timeout 10 --max-time 30 \
  "${PRODUCTION_URL%/}/grist/form-base.css" | sha256sum | cut -d ' ' -f 1)"
[[ "$public_css_hash" == "$grist_css_expected" ]] || {
  echo "Public form stylesheet does not match deployed CSS (missing, stale, or HTML response)." >&2
  exit 1
}
echo "Verified public form stylesheet: $public_css_hash"
echo "Verified deployed source: $DEPLOY_SOURCE_SHA"
REMOTE

echo "Deployment complete: $PRODUCTION_URL"
