#!/usr/bin/env bash

set -euo pipefail

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/free-port.sh"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

node -e '
  const server = require("node:net").createServer();
  server.listen(0, "127.0.0.1", () => console.log(server.address().port));
' > "$test_root/port" &
listener_pid=$!

for _ in {1..20}; do
    [[ -s "$test_root/port" ]] && break
    sleep 0.1
done

port="$(<"$test_root/port")"
[[ "$port" =~ ^[0-9]+$ ]]

bash "$script_path" "$port" > "$test_root/output"

if kill -0 "$listener_pid" 2>/dev/null; then
    echo "listener was not stopped" >&2
    exit 1
fi
grep -Fq "freed port $port" "$test_root/output"

mkdir -p "$test_root/bin"
cat > "$test_root/bin/lsof" <<'EOF'
#!/usr/bin/env bash
count_file="$LSOF_COUNT_FILE"
count=0
[[ -f "$count_file" ]] && count="$(<"$count_file")"
printf '%s' "$((count + 1))" > "$count_file"
if ((count == 0)); then
    printf '%s\n' "$STUB_PID"
fi
EOF
chmod +x "$test_root/bin/lsof"

bash -c 'trap "" TERM; while :; do sleep 1; done' &
stubborn_pid=$!
LSOF_COUNT_FILE="$test_root/lsof-count" STUB_PID="$stubborn_pid" PATH="$test_root/bin:$PATH" bash "$script_path" 4555 > "$test_root/output"

if ! kill -0 "$stubborn_pid" 2>/dev/null; then
    echo "process without a listener was force-stopped" >&2
    exit 1
fi
kill -KILL "$stubborn_pid"
wait "$stubborn_pid" 2>/dev/null || true

printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" > "$LSOF_ARGS"\nexit 1\n' > "$test_root/bin/lsof"
chmod +x "$test_root/bin/lsof"
LSOF_ARGS="$test_root/lsof-args" PATH="$test_root/bin:$PATH" bash "$script_path" 08 > "$test_root/output"
grep -Fq -- '-tiTCP:8' "$test_root/lsof-args"

echo "free-port test passed"
