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

// Copy the Electron bootstrap entry point (must stay unbundled to catch native addon crashes)
cpSync("src/electron/electron-bootstrap.js", "build/main.js");

// Symlink node_modules into build/ so electron-builder (directories.app: "build")
// can find external dependencies (native modules like cassandra-driver, pg, etc.)
const nmLink = path.join("build", "node_modules");
if (!fs.existsSync(nmLink)) {
  fs.symlinkSync(path.resolve("node_modules"), nmLink, "junction");
  log(`Symlinked: node_modules -> ${nmLink}`);
}
