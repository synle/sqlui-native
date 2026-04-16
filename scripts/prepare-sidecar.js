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

// 1. Copy the built mocked-server.js
cpSync("build/mocked-server.js", path.join(RESOURCES_DIR, "mocked-server.js"));

// 2. Copy package.json (needed for module resolution)
cpSync("package.json", path.join(RESOURCES_DIR, "package.json"));

// 3. Copy ALL node_modules dependencies and their transitive dependencies.
// The Vite mocked-server config externalizes every dependency, so any of them
// may be require()'d at runtime. Trying to maintain a manual exclusion list
// leads to missing-module crashes in production.
const appPackage = require("../package.json");
const topLevelDeps = [...Object.keys(appPackage.dependencies || {}), ...Object.keys(appPackage.optionalDependencies || {})];

// Recursively collect all transitive dependencies
const collected = new Set();

function collectDeps(depName) {
  if (collected.has(depName)) return;
  collected.add(depName);

  const pkgPath = path.join("node_modules", depName, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  for (const sub of Object.keys(pkg.dependencies || {})) {
    collectDeps(sub);
  }
  // Also follow optionalDependencies that are installed
  for (const sub of Object.keys(pkg.optionalDependencies || {})) {
    if (fs.existsSync(path.join("node_modules", sub))) {
      collectDeps(sub);
    }
  }
}

for (const dep of topLevelDeps) {
  collectDeps(dep);
}

log(`Copying ${collected.size} packages (top-level + transitive)...`);

for (const dep of collected) {
  const src = path.join("node_modules", dep);
  const dest = path.join(RESOURCES_NODE_MODULES, dep);
  if (fs.existsSync(src)) {
    cpSync(src, dest);
  }
}

log("Sidecar preparation complete.");
