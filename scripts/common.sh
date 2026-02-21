#!/bin/bash

run_step() {
  local START_TIME=$(date +%s)
  local START_STR=$(date +'%H:%M:%S')

  echo "::group::🚀 $1  [Started: $START_STR]"

  eval "$1"
  local EXIT_CODE=$?

  local END_TIME=$(date +%s)
  local END_STR=$(date +'%H:%M:%S')
  local DURATION=$((END_TIME - START_TIME))

  echo "---------------------------------------------------"
  echo "⏱️ Start at    = $START_STR"
  echo "✅ Finished at = $END_STR"
  echo "Total Runtime  = ${DURATION}s"
  echo "---------------------------------------------------"

  echo "::endgroup::"

  # Return the actual exit code so the CI fails if the command fails
  return $EXIT_CODE
}
