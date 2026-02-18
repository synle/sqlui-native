console.log(`
========================================
#<<<<< clean.js >>>>>>>>>>>>>>>>>>>>>>>>>>
========================================
`);

const fs = require("fs");
const path = require("path");

function cpSync(src, dest, filter) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.statSync(src).isDirectory()) {
    fs.cpSync(src, dest, {
      recursive: true,
      filter:
        filter ||
        function () {
          return true;
        },
    });
  } else {
    fs.copyFileSync(src, dest);
  }
  console.log("Copied:", src, "->", dest);
}

// Clean up build artifacts
["upload", ".cache", ".parcel-cache", "dist", "build", "mocked-db.sqlite"].forEach(function (p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log("Removed:", p);
  }
});

// Copy package.json to build and src
fs.mkdirSync("build", { recursive: true });
cpSync("package.json", "build/package.json");
cpSync("package.json", "src/package.json");
