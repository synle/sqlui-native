#!/bin/bash

source "$(dirname "$0")/common.sh"

####################################
# format.sh (used for code format)
####################################
run_step "npm ci || npm install"
run_step "npm run lint"
run_step "npm run format:ci"
