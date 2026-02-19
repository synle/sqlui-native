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

// Copy monaco-editor vs files to public/vs
cpSync(
  path.join("node_modules", "monaco-editor", "min", "vs"),
  path.join("public", "vs"),
  (src) => fs.statSync(src).isDirectory() || /\.(css|js)$/.test(src),
);
