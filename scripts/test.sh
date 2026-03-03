#!/bin/bash

####################################
# test.sh (used for testing)
####################################
set -e
pm ci || npm install
npm run test-ci
npm run typecheck
npm run lint
