require("./common");

log(`
==============================================
# prebuild.js
# move build content into root (package.json)
==============================================
`);

// Write a minimal package.json for build/ and public/ (electron-builder's app directory).
// Must not contain the "build" key — electron-builder rejects it in the app package.json.
// public/package.json is needed because Vite's publicDir copies it into build/ during frontend build.
fs.mkdirSync("build", { recursive: true });
fs.mkdirSync("public", { recursive: true });
cpSync("package.json", "src/package.json");

const rootPkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const buildPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  main: rootPkg.main,
  author: rootPkg.author,
  dependencies: rootPkg.dependencies,
};
const buildPkgJson = JSON.stringify(buildPkg, null, 2);
fs.writeFileSync("build/package.json", buildPkgJson);
fs.writeFileSync("public/package.json", buildPkgJson);
log("Wrote: build/package.json and public/package.json (minimal, no 'build' key)");


// Sync version from package.json to Tauri config files (if they exist)
const tauriConfPath = path.join("src-tauri", "tauri.conf.json");
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
  if (tauriConf.version !== rootPkg.version) {
    tauriConf.version = rootPkg.version;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
    log(`Synced version ${rootPkg.version} to ${tauriConfPath}`);
  }
}

const cargoTomlPath = path.join("src-tauri", "Cargo.toml");
if (fs.existsSync(cargoTomlPath)) {
  let cargoToml = fs.readFileSync(cargoTomlPath, "utf-8");
  const updated = cargoToml.replace(
    /^version\s*=\s*"[^"]*"/m,
    `version = "${rootPkg.version}"`
  );
  if (updated !== cargoToml) {
    fs.writeFileSync(cargoTomlPath, updated);
    log(`Synced version ${rootPkg.version} to ${cargoTomlPath}`);
  }
}
