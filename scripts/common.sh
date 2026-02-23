#!/bin/bash

run_step() {
  local title="$1"        # Save the title before shifting
  shift                   # Move to the actual command
  local start_time=$(date +"%H:%M:%S")

  # 1. Start the GitHub Group
  echo "::group::🚀 $title ($start_time)"

  # 2. Execute the command
  # "$@" ensures arguments with spaces stay together
  "$@"
  local exit_code=$?      # Capture if the command failed

  # 3. Print summary and close group
  local end_time=$(date +"%H:%M:%S")
  echo "---------------------------------------------------"
  echo "✅ $title finished: $start_time → $end_time"

  echo "::endgroup::"

  # 4. Return the exit code of the command so the CI knows if it failed
  return $exit_code
}
