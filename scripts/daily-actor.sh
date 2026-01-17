#!/bin/bash
ENDPOINT="https://busstop-ufgc.onrender.com/bacon/api/daily-actor"

body=$(mktemp)
status=$(curl -s -o "$body" -w "%{http_code}" "$ENDPOINT")

if [ "$status" -eq 200 ]; then
  echo "Cache primed with actor: $(cat "$body")"
else
  echo "Failed to fetch: HTTP $status"
  exit 1
fi

rm "$body"
