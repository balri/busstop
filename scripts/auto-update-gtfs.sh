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
  # Check if running interactively (manually)
  if [ -t 0 ]; then
    read -p "Push commit to remote? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      git push
    else
      echo "Push cancelled. Commit is local only."
    fi
  else
    # Non-interactive (e.g., cron), just push
    git push
  fi
else
  echo "No changes to commit."
fi

