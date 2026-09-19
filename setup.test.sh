#!/usr/bin/env bash

set -euo pipefail

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup.sh"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

make_fixture() {
    local fixture="$test_root/$1"
    mkdir -p "$fixture/apps"/{web,api,space,admin,live} "$fixture/bin"
    cp "$script_path" "$fixture/setup.sh"
    for env_file in .env apps/{web,api,space,admin,live}/.env; do
        : > "$fixture/${env_file}.example"
    done
    printf '#!/usr/bin/env bash\nexit 0\n' > "$fixture/bin/corepack"
    printf '#!/usr/bin/env bash\nexit 0\n' > "$fixture/bin/pnpm"
    chmod +x "$fixture/bin/corepack" "$fixture/bin/pnpm"
    printf '%s' "$fixture"
}

env_value() {
    local file="$1" key="$2"
    sed -n "s/^${key}=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" "$file" | tail -1
}

run_setup() {
    local fixture="$1"
    (cd "$fixture" && PATH="$fixture/bin:$PATH" bash setup.sh > setup.output 2>&1)
}

fixture="$(make_fixture missing)"
run_setup "$fixture"
root_secret="$(env_value "$fixture/.env" COPILOT_IDENTITY_TOKEN_SECRET)"
api_secret="$(env_value "$fixture/apps/api/.env" COPILOT_IDENTITY_TOKEN_SECRET)"
[[ -n "$root_secret" && "$root_secret" == "$api_secret" ]]
[[ "${#root_secret}" == "64" ]]

fixture="$(make_fixture root-only)"
printf 'COPILOT_IDENTITY_TOKEN_SECRET="root-secret"\n' > "$fixture/.env"
run_setup "$fixture"
[[ "$(env_value "$fixture/.env" COPILOT_IDENTITY_TOKEN_SECRET)" == "root-secret" ]]
[[ "$(env_value "$fixture/apps/api/.env" COPILOT_IDENTITY_TOKEN_SECRET)" == "root-secret" ]]

fixture="$(make_fixture api-only)"
printf "COPILOT_IDENTITY_TOKEN_SECRET='api&secret|value' # keep this value\nSECRET_KEY='django-secret' # keep this value\n" > "$fixture/apps/api/.env"
run_setup "$fixture"
grep -Fq 'COPILOT_IDENTITY_TOKEN_SECRET="api&secret|value"' "$fixture/.env"
grep -Fq "COPILOT_IDENTITY_TOKEN_SECRET='api&secret|value' # keep this value" "$fixture/apps/api/.env"
grep -Fq 'SECRET_KEY='"'"'django-secret'"'"' # keep this value' "$fixture/apps/api/.env"
run_setup "$fixture"
[[ "$(grep -c '^COPILOT_IDENTITY_TOKEN_SECRET=' "$fixture/.env")" == "1" ]]
[[ "$(grep -c '^COPILOT_IDENTITY_TOKEN_SECRET=' "$fixture/apps/api/.env")" == "1" ]]

fixture="$(make_fixture matching)"
printf 'COPILOT_IDENTITY_TOKEN_SECRET="shared-secret"\n' > "$fixture/.env"
printf 'COPILOT_IDENTITY_TOKEN_SECRET="shared-secret"\nSECRET_KEY="existing-django-secret"\n' > "$fixture/apps/api/.env"
run_setup "$fixture"
[[ "$(env_value "$fixture/.env" COPILOT_IDENTITY_TOKEN_SECRET)" == "shared-secret" ]]
[[ "$(env_value "$fixture/apps/api/.env" COPILOT_IDENTITY_TOKEN_SECRET)" == "shared-secret" ]]
[[ "$(env_value "$fixture/apps/api/.env" SECRET_KEY)" == "existing-django-secret" ]]
[[ "$(grep -c '^SECRET_KEY=' "$fixture/apps/api/.env")" == "1" ]]

fixture="$(make_fixture conflicting)"
printf 'COPILOT_IDENTITY_TOKEN_SECRET="root-secret"\n' > "$fixture/.env"
printf 'COPILOT_IDENTITY_TOKEN_SECRET="api-secret"\n' > "$fixture/apps/api/.env"
if run_setup "$fixture"; then
    echo "setup accepted conflicting Copilot identity secrets" >&2
    exit 1
fi
grep -Fq "COPILOT_IDENTITY_TOKEN_SECRET differs" "$fixture/setup.output"

fixture="$(make_fixture unwritable)"
ln -sf /proc/1/status "$fixture/.env"
if run_setup "$fixture"; then
    echo "setup accepted a failed Copilot secret write" >&2
    exit 1
fi
grep -Fq "Failed to write COPILOT_IDENTITY_TOKEN_SECRET" "$fixture/setup.output"

echo "setup Copilot identity secret tests passed"
