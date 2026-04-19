require("./common");

log(`
==============================================
# prepare-sidecar.js
# Copy sidecar artifacts to src-tauri/resources
==============================================
`);

const RESOURCES_DIR = path.join("src-tauri", "resources");

// Ensure directory exists
fs.mkdirSync(RESOURCES_DIR, { recursive: true });

// 1. Copy the built sqlui-server.js (single file, all deps bundled)
cpSync("build/sqlui-server.js", path.join(RESOURCES_DIR, "sqlui-server.js"));

// 2. Copy package.json (needed for module resolution fallback)
cpSync("package.json", path.join(RESOURCES_DIR, "package.json"));

// 3. Copy bundled Node.js binary (downloaded by download-node.js)
const BINARIES_DIR = path.join("src-tauri", "binaries");
const nodeSrc = process.platform === "win32"
  ? path.join(BINARIES_DIR, "node.exe")
  : path.join(BINARIES_DIR, "node");
const nodeDest = process.platform === "win32"
  ? path.join(RESOURCES_DIR, "node.exe")
  : path.join(RESOURCES_DIR, "node");

if (fs.existsSync(nodeSrc)) {
  cpSync(nodeSrc, nodeDest);
  fs.chmodSync(nodeDest, 0o755);
  log(`Bundled Node.js binary copied to ${nodeDest}`);
} else {
  log(`WARNING: No Node.js binary found at ${nodeSrc} — app will require system Node.js`);
}

// 4. Remove node_modules symlink from build/ — Tauri rejects frontendDist containing node_modules
const buildNodeModules = path.join("build", "node_modules");
if (fs.existsSync(buildNodeModules)) {
  fs.rmSync(buildNodeModules, { force: true });
  log(`Removed ${buildNodeModules} symlink (not needed for Tauri)`);
}

log("Sidecar preparation complete.");
