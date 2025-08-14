#!/bin/bash

PROJECT_DIR=$(dirname "$0")/..

export SECRET_KEYWORD="test"
export ACCEPTABLE_DELAY=60

echo "Secret keyword set to $SECRET_KEYWORD"
echo "Acceptable delay set to $ACCEPTABLE_DELAY seconds"
echo "Go to http://localhost:3000 to test the application"

node "$PROJECT_DIR/backend/index.js"
