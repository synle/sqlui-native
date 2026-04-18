require("./common");

log(`
=========================================================
# move build content into root (monaco and built bundle)
=========================================================
`);
cpSync("build", ".", (srcPath) => {
  // Skip package.json — the build/ copy is a minimal version for electron-builder
  // and must not overwrite the root package.json which contains dist-* scripts.
  return path.basename(srcPath) !== "package.json";
});
