console.log(`
========================================
#<<<<< predist.js >>>>>>>>>>>>>>>>>>>>>>>>>>
========================================
`)

const fs = require('fs');
const path = require('path');

function cpSync(src, dest, filter) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.statSync(src).isDirectory()) {
    fs.cpSync(src, dest, { recursive: true, filter: filter || function() { return true; } });
  } else {
    fs.copyFileSync(src, dest);
  }
  console.log('Copied:', src, '->', dest);
}

cpSync('build', '.');
