#!/bin/bash

run_step() {
  local START_TIME=$(date +%s)
  local START_STR=$(date +'%H:%M:%S')

  # "$*" joins all arguments into a single string for the label
  echo "::group::🚀 $* [Started: $START_STR]"

  # eval "$*" allows it to handle both:
  # We use 'command' to ensure it looks for the binary, not a shell alias
  command "$@"
  local EXIT_CODE=$?

  local END_TIME=$(date +%s)
  local END_STR=$(date +'%H:%M:%S')
  local DURATION=$((END_TIME - START_TIME))

  echo "---------------------------------------------------"
  echo "✅ $* finished in ${DURATION}s ($START_STR to $END_STR)"
  echo "---------------------------------------------------"

  echo "::endgroup::"

  return $EXIT_CODE
}
