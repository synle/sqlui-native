#!/bin/bash

run_step() {
  local START_TIME=$(date +%s)
  local START_STR=$(date +'%H:%M:%S')

  # "$*" joins all arguments into a single string for the label
  echo "::group::🚀 $* [Started: $START_STR]"

  # eval "$*" allows it to handle both:
  # 1. run_step "mv a b" (single string)
  # 2. run_step mv a b (multiple arguments)
  eval "$*"
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

  return $EXIT_CODE
}
