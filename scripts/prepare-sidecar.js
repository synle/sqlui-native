require("./common");

log(`
==============================================
# prepare-sidecar.js
# Copy sidecar artifacts to src-tauri/resources
==============================================
`);

const RESOURCES_DIR = path.join("src-tauri", "resources");
const RESOURCES_NODE_MODULES = path.join(RESOURCES_DIR, "node_modules");

// Ensure directories exist
fs.mkdirSync(RESOURCES_DIR, { recursive: true });
fs.mkdirSync(RESOURCES_NODE_MODULES, { recursive: true });

// 1. Copy the built mocked-server.js and its chunk files
cpSync("build/mocked-server.js", path.join(RESOURCES_DIR, "mocked-server.js"));
const assetsDir = path.join("build", "assets");
if (fs.existsSync(assetsDir)) {
  cpSync(assetsDir, path.join(RESOURCES_DIR, "assets"));
}

// 2. Copy package.json (needed for module resolution)
cpSync("package.json", path.join(RESOURCES_DIR, "package.json"));

// 3. Copy only native addon packages that Vite cannot bundle.
// Everything else is already inlined into mocked-server.js.
const nativeAddons = ["better-sqlite3"];

for (const dep of nativeAddons) {
  const src = path.join("node_modules", dep);
  const dest = path.join(RESOURCES_NODE_MODULES, dep);
  if (fs.existsSync(src)) {
    cpSync(src, dest);
  }
}

log("Sidecar preparation complete.");
