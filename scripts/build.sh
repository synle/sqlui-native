#!/bin/bash

source "$(dirname "$0")/common.sh"

####################################
# build.sh (used for building and packaging)
####################################
if command -v apt-get >/dev/null 2>&1; then
  run_step "sudo apt-get install -y libarchive-tools"
else
  echo "⚠️ apt-get is not present (likely Alpine or macOS). Skipping libarchive-tools installation."
fi

# Build begins
run_step "npm ci || npm install"
run_step "node scripts/prebuild.js"
run_step "npm run build"
run_step "node scripts/postbuild.js"
