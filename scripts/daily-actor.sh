#!/bin/bash
ENDPOINT="https://busstop-ufgc.onrender.com/bacon/api/prime-daily-actor"

start=$(date +%s)
body=$(mktemp)

cleanup() {
  rm -f "$body"
  end=$(date +%s)
  elapsed=$((end - start))
  echo "Script runtime: ${elapsed} seconds"
}
trap cleanup EXIT

status=$(curl -s -o "$body" -w "%{http_code}" "$ENDPOINT")

if [ "$status" -eq 200 ]; then
  echo "Cache primed with actor: $(cat "$body")"
else
  echo "Failed to fetch: HTTP $status"
  exit 1
fi
