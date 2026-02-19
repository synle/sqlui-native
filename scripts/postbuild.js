require("./common");

const buildDir = path.join(__dirname, "..", "build");
const indexPath = path.join(buildDir, "index.html");

log(`
=========================================================
# postbuild.js
buildDir = ${buildDir}
indexPath = ${indexPath}
=========================================================
`);

log(`
=========================================================
# move build content into root (monaco and built bundle)
=========================================================
`);
cpSync("build", ".");

log(`
==========================================================
# consolidate and inline build
==========================================================
`);

let html = fs.readFileSync(indexPath, "utf8");

function resolveAssetPath(href) {
  // Handle both "./static/css/foo.css" and "./assets/foo.css" and "/static/css/foo.css"
  const cleaned = href.replace(/^\.\//, "");
  const fullPath = path.join(buildDir, cleaned);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function inlineFontsInCss(css, cssDir) {
  return css.replace(/url\(([^)]+)\)/g, (urlMatch, urlValue) => {
    const cleanUrl = urlValue.replace(/["']/g, "");
    if (cleanUrl.startsWith("data:") || cleanUrl.startsWith("http")) return urlMatch;
    // Resolve relative to CSS file location
    const fontPath = path.resolve(cssDir, cleanUrl);
    if (!fs.existsSync(fontPath)) return urlMatch;
    const ext = path.extname(fontPath).slice(1);
    const mimeTypes = {
      ttf: "font/ttf",
      woff: "font/woff",
      woff2: "font/woff2",
      eot: "application/vnd.ms-fontobject",
      svg: "image/svg+xml",
    };
    const mime = mimeTypes[ext] || "application/octet-stream";
    const base64 = fs.readFileSync(fontPath).toString("base64");
    log("  Inlined font:", cleanUrl);
    return `url(data:${mime};base64,${base64})`;
  });
}

// Inline all CSS <link> tags — matches any href path pattern
html = html.replace(/<link\s+[^>]*href="([^"]+\.css)"[^>]*>/g, (match, href) => {
  // Skip if not a stylesheet
  if (!match.includes("stylesheet")) return match;
  const cssPath = resolveAssetPath(href);
  if (!cssPath) {
    console.warn("CSS file not found, skipping:", href);
    return match;
  }
  let css = fs.readFileSync(cssPath, "utf8");
  css = inlineFontsInCss(css, path.dirname(cssPath));
  log("Inlined CSS:", href, `(${css.length} bytes)`);
  return `<style>${css}</style>`;
});

// Inline all JS <script src> tags — matches any src path pattern
html = html.replace(/<script\s+[^>]*src="([^"]+\.js)"[^>]*><\/script>/g, (match, src) => {
  const jsPath = resolveAssetPath(src);
  if (!jsPath) {
    console.warn("JS file not found, skipping:", src);
    return match;
  }
  const js = fs.readFileSync(jsPath, "utf8");
  log("Inlined JS:", src, `(${js.length} bytes)`);
  // Preserve attributes like type="module", defer, etc.
  const attrs = [];
  if (match.includes('type="module"')) attrs.push('type="module"');
  if (match.includes("nomodule")) attrs.push("nomodule");
  const attrStr = attrs.length ? " " + attrs.join(" ") : "";
  return `<script${attrStr}>${js}</script>`;
});

// might not be needed
// // Inline Monaco editor CSS (loaded dynamically at runtime by vs/loader)
// const monacoEditorCssPath = path.join(buildDir, "vs", "editor", "editor.main.css");
// if (fs.existsSync(monacoEditorCssPath)) {
//   let monacoCss = fs.readFileSync(monacoEditorCssPath, "utf8");
//   monacoCss = inlineFontsInCss(monacoCss, path.dirname(monacoEditorCssPath));
//   html = html.replace("</head>", `<style>${monacoCss}</style></head>`);
//   log("Inlined Monaco CSS: vs/editor/editor.main.css", `(${monacoCss.length} bytes)`);
// } else {
//   console.warn("Monaco CSS not found, skipping: vs/editor/editor.main.css");
// }

// // Inline Monaco workerMain.js (loaded dynamically as a Web Worker)
// const workerMainPath = path.join(buildDir, "vs", "base", "worker", "workerMain.js");
// if (fs.existsSync(workerMainPath)) {
//   const workerJs = fs.readFileSync(workerMainPath, "utf8");
//   const workerBase64 = Buffer.from(workerJs).toString("base64");
//   const workerBootstrap = `<script>window.MonacoEnvironment=window.MonacoEnvironment||{};window.MonacoEnvironment.getWorker=function(workerId,label){var workerCode=atob("${workerBase64}");var blob=new Blob([workerCode],{type:"application/javascript"});var url=URL.createObjectURL(blob);return new Worker(url,{name:label});};</script>`;
//   html = html.replace("</head>", `${workerBootstrap}</head>`);
//   log("Inlined Monaco Worker: vs/base/worker/workerMain.js", `(${workerJs.length} bytes)`);
// } else {
//   console.warn("Monaco Worker not found, skipping: vs/base/worker/workerMain.js");
// }

// Inline images referenced in HTML (favicon, apple-touch-icon, etc.)
html = html.replace(/<link\s+[^>]*href="([^"]+\.(ico|png|svg))"[^>]*>/g, (match, href, ext) => {
  const imgPath = resolveAssetPath(href);
  if (!imgPath) return match;
  const mimeTypes = { ico: "image/x-icon", png: "image/png", svg: "image/svg+xml" };
  const mime = mimeTypes[ext] || "image/png";
  const base64 = fs.readFileSync(imgPath).toString("base64");
  const dataUri = `data:${mime};base64,${base64}`;
  const inlined = match.replace(href, dataUri);
  log("Inlined image:", href, `(${base64.length} bytes base64)`);
  return inlined;
});

fs.writeFileSync(indexPath, html, "utf8");

const finalSize = fs.statSync(indexPath).size;
log(`\nDone! index.html is now ${(finalSize / 1024 / 1024).toFixed(2)} MB (self-contained)`);
