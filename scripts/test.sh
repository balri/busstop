#!/bin/bash
set -eufo pipefail

PROJECT_DIR=$(dirname "$0")/..

export SECRET_KEYWORD="test"
export ACCEPTABLE_DELAY=60
export MIN_DISTANCE=500

echo "Secret keyword set to $SECRET_KEYWORD"
echo "Acceptable delay set to $ACCEPTABLE_DELAY seconds"
echo "Minimum distance set to $MIN_DISTANCE metres"
echo "Go to http://localhost:3000 to test the application"

npm run dev
