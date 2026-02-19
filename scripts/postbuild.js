require("./common");

log(`
=========================================================
# move build content into root (monaco and built bundle)
=========================================================
`);
cpSync("build", ".");
