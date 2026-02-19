# --- Handle Arguments ---
# Convert the first argument ($1) to lowercase for a case-insensitive check
input_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
if [[ "$input_lower" == "true" || "$input_lower" == "1" ]]; then
  do_npm_version_patch=1
else
  do_npm_version_patch=0
fi

# build.sh
echo """
===========================================
# build.sh
do_npm_version_patch=$do_npm_version_patch
===========================================
"""


# npm install
echo """
===========================================
npm install
===========================================
"""
npm ci || npm install


# npm run test-ci
echo """
===========================================
npm run test-ci
===========================================
"""
npm run test-ci


# --- Optional Version Patch ---
if [ "$do_npm_version_patch" -eq 1 ]; then
    echo """
===========================================
npm version --no-git-tag-version patch
===========================================
    """
    npm version --no-git-tag-version patch
fi


# npm run build
echo """
===========================================
npm run build
===========================================
"""
npm run build


# npm run clean
echo """
===========================================
npm run clean
===========================================
"""
npm run clean


# node scripts/predist.js
echo """
===========================================
node scripts/predist.js
===========================================
"""
node scripts/predist.js
