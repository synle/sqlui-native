#!/bin/bash

####################################
# build.sh (used for building and packaging)
####################################
if command -v apt-get >/dev/null 2>&1; then
  echo "🚀 sudo apt-get install -y libarchive-tools"
  sudo apt-get install -y libarchive-tools
else
  echo "⚠️ apt-get is not present (likely Alpine or macOS). Skipping libarchive-tools installation."
fi

# Build begins
echo "🚀 npm ci || npm install"
npm ci || npm install
echo "🚀 node scripts/prebuild.js"
node scripts/prebuild.js
echo "🚀 npm run build"
npm run build
echo "🚀 node scripts/postbuild.js"
node scripts/postbuild.js
