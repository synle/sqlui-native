/**
 * Helpers for embedding the frontend `build/` directory into a Node SSR bundle.
 *
 * Why a sibling JSON instead of inlining via Vite `define`: multi-MB literals
 * passed through `define` blow up during minification (~40x bloat). Writing the
 * map to a sibling file keeps the JS bundle small and the JSON predictable.
 *
 * Two exports:
 *   - `buildEmbeddedAssetMap(dir)` — walk a directory and base64-encode every file
 *   - `emitEmbeddedAssetsPlugin({ assetsDir, outFile })` — Vite plugin that calls
 *     `buildEmbeddedAssetMap` at `closeBundle` and writes the result to disk
 */

import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Recursively walks a directory and returns relative file paths.
 * Skips:
 *   - dotfiles
 *   - *.map source maps
 *   - the server bundle and its asset JSON (sqlui-server*.js, sqlui-server*.json),
 *     which would cause a self-embedding loop when the sidecar build emits its
 *     output into the same dir it's reading from
 */
function walk(dir: string, baseDir = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    // Skip sibling server artifacts to prevent embedding the server in itself
    if (/^sqlui-server.*\.(js|json)$/.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Don't descend into node_modules — it's a symlink to the project's
      // node_modules in dev and would balloon the bundle.
      if (entry.name === "node_modules") continue;
      out.push(...walk(full, baseDir));
    } else if (entry.isFile()) {
      if (entry.name.endsWith(".map")) continue;
      out.push(path.relative(baseDir, full));
    }
  }
  return out;
}

/**
 * Reads `assetsDir` and returns a base64-encoded map of every file.
 *
 * @param assetsDir - Absolute path to the directory containing index.html and assets/.
 * @returns Object mapping forward-slashed relative paths → base64 file contents.
 */
export function buildEmbeddedAssetMap(assetsDir: string): Record<string, string> {
  const files = walk(assetsDir);
  const map: Record<string, string> = {};
  let totalBytes = 0;
  for (const rel of files) {
    const full = path.join(assetsDir, rel);
    const buf = fs.readFileSync(full);
    totalBytes += buf.length;
    const key = rel.split(path.sep).join("/");
    map[key] = buf.toString("base64");
  }
  // eslint-disable-next-line no-console
  console.log(`[embed-frontend-assets] embedded ${files.length} file(s), ${(totalBytes / 1024).toFixed(0)} KB from ${assetsDir}`);
  return map;
}

/** Options for the {@link emitEmbeddedAssetsPlugin} Vite plugin. */
export type EmitEmbeddedAssetsOptions = {
  /** Absolute path to the directory whose contents should be embedded. */
  assetsDir: string;
  /** Absolute path to the JSON file to write (typically next to the bundle entry). */
  outFile: string;
};

/**
 * Vite plugin that walks `assetsDir` at `closeBundle` and writes a base64 map
 * to `outFile` as JSON. Used by both the portal and sidecar bundles so the
 * Hono server can serve the UI from a single Node process.
 *
 * The corresponding runtime loader (in portal.ts / index.ts) reads the file
 * at startup with `fs.readFileSync(path.join(__dirname, "<basename>"))`.
 */
export function emitEmbeddedAssetsPlugin(opts: EmitEmbeddedAssetsOptions): Plugin {
  return {
    name: "sqlui:emit-embedded-assets-json",
    closeBundle() {
      const map = buildEmbeddedAssetMap(opts.assetsDir);
      fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
      fs.writeFileSync(opts.outFile, JSON.stringify(map));
    },
  };
}
