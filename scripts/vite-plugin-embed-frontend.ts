/**
 * Builds a base64 map of frontend assets to embed into a Node bundle.
 *
 * Returns a JSON-serialized `Record<string, string>` (relative path → base64).
 * Used in conjunction with Vite's `define` option so the portal entry can
 * reference the result as a compile-time global (`__SQLUI_EMBEDDED_ASSETS__`).
 *
 * Walks `assetsDir` once at config evaluation time and snapshots all files.
 * Skips dotfiles and source maps to keep the bundle lean.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Recursively walks a directory and returns relative file paths.
 * Skips dotfiles and *.map source maps.
 */
function walk(dir: string, baseDir = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
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
