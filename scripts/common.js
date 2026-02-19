globalThis.fs = require("fs");
globalThis.path = require("path");
globalThis.log = console.log;

/**
 * Utility: Synchronous Copy with directory support
 */
globalThis.cpSync = function cpSync(src, dest, filter = () => true) {
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
};
