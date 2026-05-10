#!/usr/bin/env node
/**
 * Builds the sqlui-portal distribution:
 *   1. Cleans build/ (frontend output dir) so stale assets don't bloat the bundle
 *   2. Frontend bundle  (vite.frontend.config.ts → build/)
 *   3. Portal sidecar   (vite.sqlui-portal.config.ts → dist/portal/)
 *      - sqlui-portal.js          : the server bundle
 *      - sqlui-portal-assets.json : embedded frontend (read at runtime)
 *   4. Copies the bash launcher next to the JS bundle
 *
 * Run via `npm run build:portal`.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist", "portal");
const buildDir = path.join(root, "build");

// Resolve the local Vite binary — invoking via npm fails when the user's
// global npm install is broken, and vite is always present in node_modules.
const vite = path.join(root, "node_modules", ".bin", "vite");
if (!fs.existsSync(vite)) {
  console.error("build-portal: ./node_modules/.bin/vite not found — run `npm install` first.");
  process.exit(1);
}

function run(args) {
  console.log(`→ vite ${args.join(" ")}`);
  execFileSync(vite, args, { cwd: root, stdio: "inherit" });
}

// 1. Clean build/ (preserve the node_modules symlink and src dir; remove everything else).
//    We can't `rm -rf build` outright because Vite SSR for the desktop sidecar relies on
//    the `build/node_modules` symlink, but we can purge stale assets and the prior index.html.
if (fs.existsSync(buildDir)) {
  for (const entry of fs.readdirSync(buildDir)) {
    if (entry === "node_modules") continue; // preserve dep symlink for sidecar build
    fs.rmSync(path.join(buildDir, entry), { recursive: true, force: true });
  }
}

// 2. Frontend bundle (drops fresh build/index.html + build/assets/)
run(["build", "--config", "vite.frontend.config.ts"]);

// 3. Portal sidecar bundle (uses build/ as embed source)
run(["build", "--config", "vite.sqlui-portal.config.ts"]);

// 4. Copy launcher and chmod +x
const launcherSrc = path.join(root, "scripts", "sqlui-portal");
const launcherDst = path.join(distDir, "sqlui-portal");
fs.copyFileSync(launcherSrc, launcherDst);
fs.chmodSync(launcherDst, 0o755);

const jsSize = (fs.statSync(path.join(distDir, "sqlui-portal.js")).size / 1024 / 1024).toFixed(2);
const jsonSize = (fs.statSync(path.join(distDir, "sqlui-portal-assets.json")).size / 1024 / 1024).toFixed(2);
console.log("");
console.log(`✓ Portal build ready in dist/portal/`);
console.log(`  sqlui-portal.js              ${jsSize} MB  (server)`);
console.log(`  sqlui-portal-assets.json     ${jsonSize} MB  (embedded frontend)`);
console.log(`  sqlui-portal                 bash launcher`);
console.log("");
console.log(`  Run:  ./dist/portal/sqlui-portal ./mydata.sqlite`);
