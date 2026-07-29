#!/usr/bin/env node
/**
 * Builds the sqlui-portal distribution as a single .tar.gz that works for BOTH
 * curl|tar and npx flows.
 *
 *   1. Cleans build/ (frontend output dir) so stale assets don't bloat the bundle
 *   2. Frontend bundle  (vite.frontend.config.ts → build/)
 *   3. Portal sidecar   (vite.sqlui-portal.config.ts → dist/portal/)
 *      - sqlui-portal.js          : the server bundle (shebang'd, +x)
 *      - sqlui-portal-assets.json : embedded frontend (read at runtime)
 *      - package.json             : npm package manifest, bin → ./sqlui-portal.js
 *   4. Copies the bash launcher next to the JS bundle
 *   5. Tars dist/portal/ into dist/sqlui-portal-<version>.tar.gz
 *
 * The single tarball serves both:
 *   curl | tar -xz && ./portal/sqlui-portal …    (bash launcher flow)
 *   npx <url-to-tar.gz> …                        (npm/pacote strips ./portal,
 *                                                 finds package.json, runs bin)
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

function runIn(cmd, args, cwd) {
  console.log(`→ ${cmd} ${args.join(" ")}  (cwd=${path.relative(root, cwd) || "."})`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
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

// 5. Roll dist/portal/ into a single .tar.gz that serves both flows.
const pkg = JSON.parse(fs.readFileSync(path.join(distDir, "package.json"), "utf-8"));
const tarballName = `sqlui-portal-${pkg.version}.tar.gz`;
const tarballPath = path.join(root, "dist", tarballName);
runIn("tar", ["-czf", tarballPath, "-C", path.dirname(distDir), "portal"], root);

const jsSize = (fs.statSync(path.join(distDir, "sqlui-portal.js")).size / 1024 / 1024).toFixed(2);
const jsonSize = (
  fs.statSync(path.join(distDir, "sqlui-portal-assets.json")).size /
  1024 /
  1024
).toFixed(2);
const tarSize = (fs.statSync(tarballPath).size / 1024 / 1024).toFixed(2);
console.log("");
console.log(`✓ Portal build ready`);
console.log(`  dist/portal/sqlui-portal.js              ${jsSize} MB  (server, shebang'd)`);
console.log(`  dist/portal/sqlui-portal-assets.json     ${jsonSize} MB  (embedded frontend)`);
console.log(`  dist/portal/sqlui-portal                 bash launcher`);
console.log(`  dist/portal/package.json                 npm package manifest`);
console.log(`  dist/${tarballName}    ${tarSize} MB  (single tarball — both flows)`);
console.log("");
console.log(`  curl + tar:  curl -fsSL <url> | tar -xz && ./portal/sqlui-portal ./mydata.sqlite`);
console.log(`  npx:         npx <url> ./mydata.sqlite`);
