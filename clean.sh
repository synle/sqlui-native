#!/bin/bash
# Clean build artifacts and copy required files

node -e "
const fs = require('fs');
const path = require('path');

function rmrf(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log('Removed:', p);
  }
}

['upload', '.cache', '.parcel-cache', 'dist', 'build', 'mocked-db.sqlite', 'public/vs'].forEach(rmrf);

// Copy package.json to build and src
['build', 'src'].forEach(function(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync('package.json', path.join(dir, 'package.json'));
  console.log('Copied: package.json -> ' + dir + '/package.json');
});

// Copy monaco-editor vs files to public/vs
const srcBase = path.join('node_modules', 'monaco-editor', 'min', 'vs');
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (/\.(css|js)$/.test(entry.name)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyDir(srcBase, path.join('public', 'vs'));
console.log('Copied: monaco-editor vs files -> public/vs');
"
