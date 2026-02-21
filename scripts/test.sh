#!/bin/bash

source "$(dirname "$0")/common.sh"

####################################
# test.sh (used for testing)
####################################
set -e
run_step "npm ci || npm install"
run_step "npm run test-ci"
run_step "npm run typecheck"
run_step "npm run lint"
