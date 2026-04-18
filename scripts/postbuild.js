require("./common");

log(`
=========================================================
# postbuild.js
# Copy Electron entry files into the build directory
# electron-builder uses directories.app = "build"
=========================================================
`);

// Copy Electron bootstrap (main.js) and preload into build/
cpSync("src/electron/electron-bootstrap.js", "build/main.js");
log("Copied: src/electron/electron-bootstrap.js -> build/main.js");

// Create a minimal preload.js — exposes requireElectron for the renderer
const preloadContent = `window.requireElectron = require;\nwindow.process = process;\n`;
fs.writeFileSync("build/preload.js", preloadContent);
log("Wrote: build/preload.js");
