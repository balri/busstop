#!/bin/bash
set -e

export PATH="/opt/homebrew/bin:/usr/bin:/bin"

# Change to the directory where this script is located
cd "$(dirname "$0")/.."

# Pull latest changes (optional, but recommended)
git pull

# Install dependencies
npm ci || npm install

# Run your GTFS import script (adjust as needed)
npx ts-node src/filter/index.ts

# Add files you expect to change (adjust paths as needed)
git add stops.json

# Only commit if there are changes
if ! git diff --cached --quiet; then
  git commit -m "Auto-update GTFS data and config"
  git push
else
  echo "No changes to commit."
fi

