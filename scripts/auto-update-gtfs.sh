#!/bin/bash

set -e

# Go to the repo directory
cd /path/to/your/busstop

# Pull latest changes (optional, but recommended)
git pull

# Run your GTFS import script (adjust as needed)
npx ts-node src/filter/index.ts

# Add files you expect to change (adjust paths as needed)
git add feeds/ routes.json stops.json

# Only commit if there are changes
if ! git diff --cached --quiet; then
  git commit -m "Auto-update GTFS data and config"
  git push
else
  echo "No changes to commit."
fi

