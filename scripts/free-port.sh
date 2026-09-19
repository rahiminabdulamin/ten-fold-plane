#!/usr/bin/env bash

set -euo pipefail

port_input="${1:-3000}"

if ! [[ "$port_input" =~ ^[0-9]+$ ]] || ((${#port_input} > 5)); then
    echo "Usage: $0 [port 1-65535]" >&2
    exit 2
fi

port=$((10#$port_input))

if ((port < 1 || port > 65535)); then
    echo "Usage: $0 [port 1-65535]" >&2
    exit 2
fi

if ! pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)"; then
    echo "port $port is already free"
    exit 0
fi

mapfile -t pid_list <<< "$pids"
echo "stopping listener(s) on port $port: ${pid_list[*]}"
kill -TERM "${pid_list[@]}"
sleep 1

remaining=()
if remaining_pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)" && [[ -n "$remaining_pids" ]]; then
    mapfile -t remaining <<< "$remaining_pids"
fi

if ((${#remaining[@]})); then
    echo "force-stopping listener(s): ${remaining[*]}"
    kill -KILL "${remaining[@]}"
fi

echo "freed port $port"
