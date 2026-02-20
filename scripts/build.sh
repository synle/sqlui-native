set -e

input_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
if [[ "$input_lower" == "true" || "$input_lower" == "1" ]]; then
  do_npm_version_patch=1
else
  do_npm_version_patch=0
fi

echo """
===================================================
# do_npm_version_patch=$do_npm_version_patch
===================================================
"""


echo """
===================================================
# npm install
===================================================
"""
npm ci || npm install

if [ "$do_npm_version_patch" -eq 1 ]; then
    echo """
===================================================
# npm version --no-git-tag-version patch [Optional]
===================================================
    """
    npm version --no-git-tag-version patch
fi

echo """
===================================================
# node scripts/prebuild.js
===================================================
"""
node scripts/prebuild.js

echo """
===================================================
# npm run build
===================================================
"""
npm run build

echo """
===================================================
# node scripts/postbuild.js
===================================================
"""
node scripts/postbuild.js


echo """
===================================================
# npm run test-ci && npm run typecheck
===================================================
"""
npm run test-ci
npm run typecheck
