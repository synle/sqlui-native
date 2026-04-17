require("./common");

log(`
==============================================
# prebuild.js
# move build content into root (package.json)
==============================================
`);

// Copy package.json to build and src
fs.mkdirSync("build", { recursive: true });
fs.mkdirSync("public", { recursive: true });
cpSync("package.json", "build/package.json");
cpSync("package.json", "src/package.json");
cpSync("package.json", "public/package.json");

// Copy the Electron bootstrap entry point (must stay unbundled to catch native addon crashes)
cpSync("src/electron/electron-bootstrap.js", "build/main.js");
