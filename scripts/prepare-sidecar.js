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

log("Sidecar preparation complete.");
