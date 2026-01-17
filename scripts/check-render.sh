#!/bin/bash

URL="https://busstop-ufgc.onrender.com/health"
LOGFILE="$HOME/render-uptime.log"
STATEFILE="$HOME/render-uptime.state"

timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

notify() {
  # Example: macOS notification (replace with mail, telegram, etc.)
  osascript -e "display notification \"$1\" with title \"Render Uptime\""
}

if curl -fsS --max-time 10 "$URL" > /dev/null; then
  echo "$(timestamp) - OK" >> "$LOGFILE"

  # If previously down, clear state and notify recovery
  if [ -f "$STATEFILE" ]; then
    rm "$STATEFILE"
    notify "✅ Service recovered at $(timestamp)"
  fi
else
  echo "$(timestamp) - FAIL" >> "$LOGFILE"

  # Only notify on first failure
  if [ ! -f "$STATEFILE" ]; then
    echo "DOWN" > "$STATEFILE"
    notify "❌ Service DOWN at $(timestamp)"
  fi
fi
