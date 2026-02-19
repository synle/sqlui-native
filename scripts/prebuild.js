const fs = require("fs");
const path = require("path");
const log = console.log;

const buildDir = path.join(__dirname, "..", "build");
const indexPath = path.join(buildDir, "index.html");

/**
 * Utility: Synchronous Copy with directory support
 */
function cpSync(src, dest, filter = () => true) {
  if (!fs.existsSync(src)) return;

  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((file) => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      if (filter(srcFile)) cpSync(srcFile, destFile, filter);
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  log(`Copied: ${src} -> ${dest}`);
}

log(`
==============================================
# move build content into root (package.json)
==============================================
`);

// Copy package.json to build and src
fs.mkdirSync("build", { recursive: true });
cpSync("package.json", "build/package.json");
cpSync("package.json", "src/package.json");
