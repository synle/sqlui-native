#!/bin/bash

####################################
# build.sh (used for building and packaging)
####################################
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get install -y libarchive-tools
else
  echo "⚠️ apt-get is not present (likely Alpine or macOS). Skipping libarchive-tools installation."
fi

# Build begins
npm ci || npm install
node scripts/prebuild.js
npm run build
node scripts/postbuild.js
