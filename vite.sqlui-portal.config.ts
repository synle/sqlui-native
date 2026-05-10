/**
 * Vite build configuration for the sqlui-portal single-file bundle.
 *
 * Produces `dist/portal/sqlui-portal.js` — a self-contained Node script that:
 *   - bundles all pure-JS dependencies (Express, db drivers, …) inline (no node_modules needed)
 *   - embeds the frontend `build/` directory as a base64 map (extracted to a temp dir at runtime)
 *
 * Run after `npm run build` so `build/index.html` and `build/assets/` exist for embedding.
 */

import path from "node:path";
import { defineConfig } from "vite";
import { emitEmbeddedAssetsPlugin } from "./scripts/vite-plugin-embed-frontend";

const externalsDeps: string[] = [];

const buildDir = path.resolve(__dirname, "build");
const outDir = path.resolve(__dirname, "dist", "portal");

export default defineConfig({
  // The portal SSR bundle has no use for public/ — that directory only
  // exists for the frontend (favicon, manifest, etc., which are already
  // embedded via the frontend build).
  publicDir: false,
  plugins: [
    emitEmbeddedAssetsPlugin({
      assetsDir: buildDir,
      outFile: path.join(outDir, "sqlui-portal-assets.json"),
    }),
  ],
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
