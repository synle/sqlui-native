/**
 * Vite build configuration for the sqlui-portal single-file bundle.
 *
 * Produces `dist/portal/sqlui-portal.js` — a self-contained Node script that:
 *   - bundles all pure-JS dependencies (Hono, db drivers, …) inline (no node_modules needed)
 *   - embeds the frontend `build/` directory as a base64 map (extracted to a temp dir at runtime)
 *
 * Run after `npm run build` so `build/index.html` and `build/assets/` exist for embedding.
 */

import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { emitEmbeddedAssetsPlugin } from "./scripts/vite-plugin-embed-frontend";
import appPackage from "./package.json";

const externalsDeps: string[] = [];

const buildDir = path.resolve(__dirname, "build");
const outDir = path.resolve(__dirname, "dist", "portal");

/**
 * Prepends a `#!/usr/bin/env node` shebang to the emitted entry chunk and chmods
 * it executable. Required so `npx <tarball-url>` and `./sqlui-portal.js` Just Work.
 */
function shebangAndChmod(): Plugin {
  return {
    name: "sqlui:shebang-and-chmod",
    closeBundle() {
      const entry = path.join(outDir, "sqlui-portal.js");
      if (!fs.existsSync(entry)) return;
      const original = fs.readFileSync(entry, "utf-8");
      if (!original.startsWith("#!")) {
        fs.writeFileSync(entry, "#!/usr/bin/env node\n" + original);
      }
      fs.chmodSync(entry, 0o755);
    },
  };
}

/**
 * Writes a minimal npm package.json into `dist/portal/` so the directory is a
 * valid npm-installable layout. After build, `npm pack` (run by build-portal.js)
 * turns it into `synle-sqlui-portal-<version>.tgz` that `npx <tarball-url>` can run.
 */
function writePortalPackageJson(): Plugin {
  return {
    name: "sqlui:write-portal-package-json",
    closeBundle() {
      const pkg = {
        name: "@synle/sqlui-portal",
        version: appPackage.version,
        description: "Portable web portal for sqlui-native — phpMyAdmin-style for any supported dialect.",
        homepage: "https://github.com/synle/sqlui-native#portal-mode-web",
        bugs: "https://github.com/synle/sqlui-native/issues",
        license: appPackage.license,
        author: appPackage.author,
        repository: appPackage.repository,
        engines: { node: ">=22" },
        bin: { "sqlui-portal": "./sqlui-portal.js" },
        files: ["sqlui-portal.js", "sqlui-portal-assets.json"],
      };
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
    },
  };
}

export default defineConfig({
  // The portal SSR bundle has no use for public/ — that directory only
  // exists for the frontend (favicon, manifest, etc., which are already
  // embedded via the frontend build).
  publicDir: false,
  // Inline the app version at build time so portal.ts's banner + --version
  // flag don't have to require("src/package.json") at runtime (which doesn't
  // resolve from the SSR-bundled output).
  define: {
    __APP_VERSION__: JSON.stringify(appPackage.version),
  },
  plugins: [
    emitEmbeddedAssetsPlugin({
      assetsDir: buildDir,
      outFile: path.join(outDir, "sqlui-portal-assets.json"),
    }),
    shebangAndChmod(),
    writePortalPackageJson(),
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
