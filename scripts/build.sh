run_step() {
  echo """
  ===================================================
  # $1
  ===================================================
  """
  eval "$1"
}

# NOTE: used for deployment / packaging
run_step "npm ci || npm install"
run_step "npm version --no-git-tag-version patch"
run_step "node scripts/prebuild.js"
run_step "npm run build"
run_step "node scripts/postbuild.js"
