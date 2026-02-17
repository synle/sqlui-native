#!/bin/bash
set -e

npm version --no-git-tag-version patch
bash build.sh
npm run dist
