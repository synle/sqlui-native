bash build.sh

node -e "require('fs').cpSync('build', '.', { recursive: true }); console.log('Copied: build/**/* -> .');"
npm run dist
