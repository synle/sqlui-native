#!/bin/bash

####################################
# build.sh (builds frontend for Tauri)
####################################
echo "npm ci || npm install"
npm ci || npm install
echo "node scripts/prebuild.js"
node scripts/prebuild.js
echo "npm run build"
npm run build
