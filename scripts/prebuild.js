require("./common");

log(`
==============================================
# prebuild.js
# Prepare build directories and copy assets
==============================================
`);

// Ensure build and public directories exist
fs.mkdirSync("build", { recursive: true });
fs.mkdirSync("public", { recursive: true });

// Copy package.json to src (for module resolution during build)
cpSync("package.json", "src/package.json");

// Copy monaco-editor vs files to public/vs
cpSync(
  path.join("node_modules", "monaco-editor", "min", "vs"),
  path.join("public", "vs"),
  (src) => fs.statSync(src).isDirectory() || /\.(css|js)$/.test(src),
);
