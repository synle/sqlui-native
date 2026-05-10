/**
 * Vite build configuration for the sqlui-portal single-file bundle.
 *
 * Produces `dist/portal/sqlui-portal.js` — a self-contained Node script that:
 *   - bundles all pure-JS dependencies (Express, db drivers, …) inline (no node_modules needed)
 *   - embeds the frontend `build/` directory as a base64 map (extracted to a temp dir at runtime)
 *
 * Run after `npm run build` so `build/index.html` and `build/assets/` exist for embedding.
 */

import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { buildEmbeddedAssetMap } from "./scripts/vite-plugin-embed-frontend";

const externalsDeps: string[] = [];

const buildDir = path.resolve(__dirname, "build");
const outDir = path.resolve(__dirname, "dist", "portal");

/**
 * Writes the embedded asset map as a sibling JSON file next to the bundle.
 * The portal entry reads it at startup with fs. We deliberately avoid inlining
 * the map via Vite's `define` — multi-MB literals expand catastrophically
 * during minification (~40x bloat).
 */
function emitEmbeddedAssetsJson(): Plugin {
  return {
    name: "sqlui:emit-embedded-assets-json",
    closeBundle() {
      const map = buildEmbeddedAssetMap(buildDir);
      const dest = path.join(outDir, "sqlui-portal-assets.json");
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(dest, JSON.stringify(map));
    },
  };
}

export default defineConfig({
  // The portal SSR bundle has no use for public/ — that directory only
  // exists for the frontend (favicon, manifest, etc., which are already
  // embedded via the frontend build).
  publicDir: false,
  plugins: [emitEmbeddedAssetsJson()],
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: "./src/sqlui-server/portal.ts",
      external: externalsDeps,
      output: {
        entryFileNames: "sqlui-portal.js",
        format: "cjs",
        inlineDynamicImports: true,
      },
    },
    target: "node18",
    minify: true,
    ssr: true,
  },
  ssr: {
    external: externalsDeps,
    noExternal: true,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
      electron: path.resolve(__dirname, "electron"),
      typings: path.resolve(__dirname, "typings"),
    },
  },
} as any);
