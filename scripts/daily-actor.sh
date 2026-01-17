#!/bin/bash

ENDPOINT="https://busstop-ufgc.onrender.com/bacon/api/daily-actor"

response=$(curl -s -w "\n%{http_code}" "$ENDPOINT")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n1)

if [ "$status" -eq 200 ]; then
  echo "Cache primed with actor: $body"
else
  echo "Failed to fetch: HTTP $status"
  exit 1
fi
