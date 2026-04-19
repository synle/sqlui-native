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
