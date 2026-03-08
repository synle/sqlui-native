require("./common");

log(`
=========================================================
# move build content into root (monaco and built bundle)
=========================================================
`);
// Skip root index.html (Vite source template) to avoid overwriting it
// with the build output version
cpSync("build", ".", (src) => path.basename(src) !== "index.html" || src !== path.join("build", "index.html"));
