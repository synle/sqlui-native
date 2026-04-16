require("./common");

log(`
==============================================
# prebuild.js
# Prepare build directories and copy assets
==============================================
`);

// Sync version from package.json to tauri.conf.json and Cargo.toml
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const appVersion = packageJson.version;

const tauriConfPath = path.join("src-tauri", "tauri.conf.json");
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
  if (tauriConf.version !== appVersion) {
    tauriConf.version = appVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
    log(`Synced version ${appVersion} to ${tauriConfPath}`);
  }
}

const cargoTomlPath = path.join("src-tauri", "Cargo.toml");
if (fs.existsSync(cargoTomlPath)) {
  const cargoToml = fs.readFileSync(cargoTomlPath, "utf-8");
  const updatedCargoToml = cargoToml.replace(/^version\s*=\s*"[^"]*"/m, `version = "${appVersion}"`);
  if (updatedCargoToml !== cargoToml) {
    fs.writeFileSync(cargoTomlPath, updatedCargoToml);
    log(`Synced version ${appVersion} to ${cargoTomlPath}`);
  }
}

// Ensure build and public directories exist
fs.mkdirSync("build", { recursive: true });
fs.mkdirSync("public", { recursive: true });

// Copy package.json to src (for module resolution during build)
cpSync("package.json", "src/package.json");

// Copy the Electron bootstrap entry point (must stay unbundled to catch native addon crashes)
cpSync("src/electron/electron-bootstrap.js", "build/main.js");

// Copy monaco-editor vs files to public/vs
cpSync(
  path.join("node_modules", "monaco-editor", "min", "vs"),
  path.join("public", "vs"),
  (src) => fs.statSync(src).isDirectory() || /\.(css|js)$/.test(src),
);
