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

// 3. Copy required node_modules (native and external dependencies)
// These are the dependencies marked as external in vite.mocked-server.config.ts
const appPackage = require("../package.json");
const externalDeps = [
  ...Object.keys(appPackage.dependencies || {}),
  ...Object.keys(appPackage.optionalDependencies || {}),
].filter((dep) => {
  // Skip frontend-only packages that aren't needed by the sidecar
  const frontendOnly = [
    "@tauri-apps/api",
    "@tauri-apps/plugin-opener",
    "@tauri-apps/plugin-shell",
    "@emotion/react",
    "@emotion/styled",
    "@mui/icons-material",
    "@mui/lab",
    "@mui/material",
    "@tanstack/react-query",
    "@tanstack/react-query-devtools",
    "@tanstack/react-table",
    "@tanstack/react-virtual",
    "@testing-library/dom",
    "@types/better-sqlite3",
    "@xyflow/react",
    "fuzzysort",
    "html-to-image",
    "monaco-editor",
    "react",
    "react-dom",
    "react-router",
    "sql-formatter",
  ];
  return !frontendOnly.includes(dep);
});

for (const dep of externalDeps) {
  const src = path.join("node_modules", dep);
  const dest = path.join(RESOURCES_NODE_MODULES, dep);
  if (fs.existsSync(src)) {
    cpSync(src, dest);
  }
}

// Also copy any scoped dependency sub-dependencies that native modules need
const nativeDeps = ["better-sqlite3", "cassandra-driver", "mongodb", "mysql2", "pg", "tedious", "redis"];
for (const dep of nativeDeps) {
  const depPkgPath = path.join("node_modules", dep, "package.json");
  if (!fs.existsSync(depPkgPath)) continue;

  const depPkg = JSON.parse(fs.readFileSync(depPkgPath, "utf-8"));
  const subDeps = Object.keys(depPkg.dependencies || {});
  for (const subDep of subDeps) {
    const src = path.join("node_modules", subDep);
    const dest = path.join(RESOURCES_NODE_MODULES, subDep);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      cpSync(src, dest);
    }
  }
}

log("Sidecar preparation complete.");
