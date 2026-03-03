#!/bin/bash

####################################
# format.sh (used for code format)
####################################
npm ci || npm install
npm run lint
npm run format:ci
