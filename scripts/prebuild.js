require("./common");

log(`
==============================================
# prebuild.js
# sync version from tauri.conf.json → package.json
# move build content into root (package.json)
==============================================
`);

// Sync version: pick the higher version between tauri.conf.json and package.json.
const tauriConfPath = "src-tauri/tauri.conf.json";
const pkgPath = "package.json";
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const tauriVersion = tauriConf.version;
const pkgVersion = pkg.version;

if (tauriVersion && pkgVersion && tauriVersion !== pkgVersion) {
  const tauriParts = tauriVersion.split(".").map(Number);
  const pkgParts = pkgVersion.split(".").map(Number);
  const usePackageVersion =
    pkgParts[0] > tauriParts[0] ||
    (pkgParts[0] === tauriParts[0] && pkgParts[1] > tauriParts[1]) ||
    (pkgParts[0] === tauriParts[0] && pkgParts[1] === tauriParts[1] && pkgParts[2] > tauriParts[2]);

  const canonicalVersion = usePackageVersion ? pkgVersion : tauriVersion;

  if (usePackageVersion) {
    tauriConf.version = canonicalVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
    log(`Synced version: ${canonicalVersion} (package.json → tauri.conf.json)`);
  } else {
    pkg.version = canonicalVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    log(`Synced version: ${canonicalVersion} (tauri.conf.json → package.json)`);
  }

  const lockPath = "package-lock.json";
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    lock.version = canonicalVersion;
    if (lock.packages && lock.packages[""]) {
      lock.packages[""].version = canonicalVersion;
    }
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
    log(`Synced version: ${canonicalVersion} → package-lock.json`);
  }
} else {
  log(`Version already in sync: ${tauriVersion}`);
}

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

// Symlink node_modules into build/ so electron-builder can find native externals
// (cassandra-driver, pg, tedious, etc. that are excluded from the Vite bundle)
const buildNodeModules = path.join("build", "node_modules");
const rootNodeModules = path.resolve("node_modules");
if (!fs.existsSync(buildNodeModules)) {
  fs.symlinkSync(rootNodeModules, buildNodeModules, "junction");
  log(`Symlinked: ${buildNodeModules} -> ${rootNodeModules}`);
} else {
  log(`Skipped symlink: ${buildNodeModules} already exists`);
}
