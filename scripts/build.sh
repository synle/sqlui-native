run_step() {
  echo """
===================================================
# $1
===================================================
"""
  eval "$1"
}

input_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
if [[ "$input_lower" == "true" || "$input_lower" == "1" ]]; then
  # NOTE: used for deployment / packaging
  run_step "npm ci || npm install"
  run_step "npm version --no-git-tag-version patch"
  run_step "node scripts/prebuild.js"
  run_step "npm run build"
  run_step "node scripts/postbuild.js"
  # run_step "npm run test-ci"  # [Optional] here because we already run the test in prebuild
  # run_step "npm run typecheck"  # [Optional] here because we already run the test in prebuild
else
  # NOTE: for prebuild, used to check everything
  set -e
  run_step "npm ci || npm install"
  run_step "node scripts/prebuild.js"
  run_step "npm run build"
  run_step "node scripts/postbuild.js"
  run_step "npm run test-ci"
  run_step "npm run typecheck"
fi

