#!/bin/bash
set -e

npm install
npm run test-ci
npm run build
node scripts/predist.js
