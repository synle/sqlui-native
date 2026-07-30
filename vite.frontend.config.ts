import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { execSync } from "node:child_process";

/**
 * npm packages that must be emitted into the same chunk as React core.
 *
 * Splitting any of these away from `react` itself produces a circular chunk
 * import: the chunk holding React's module factory ends up initialized from the
 * chunk holding `react-dom`, so React's namespace object is still `undefined`
 * when its exports are assigned. The runtime symptom is a hard boot failure
 * (`Cannot set properties of undefined (setting 'Activity')`) with the app stuck
 * on the static "Loading..." placeholder.
 */
const REACT_CORE_PACKAGES = new Set([
  "react",
  "react-dom",
  "react-is",
  "scheduler",
  "use-sync-external-store",
  "react-router",
  "react-router-dom",
]);

/**
 * Resolves the npm package name that owns a Rollup module id.
 *
 * Matches on path segments rather than substrings so that sibling packages
 * sharing a name prefix (`react` vs `radix-ui` vs `react-transition-group`)
 * are never conflated. The last `/node_modules/` wins so nested and pnpm-style
 * installs resolve to the actual package rather than its host.
 *
 * @param id - Rollup module id, either POSIX or Windows style.
 * @returns The package name (scope included, e.g. `@mui/material`), or `undefined` when the id is not inside `node_modules`.
 */
export function getNodeModulesPackageName(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  const marker = "/node_modules/";
  const markerIndex = normalizedId.lastIndexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  const rest = normalizedId.slice(markerIndex + marker.length);
  const parts = rest.split("/");
  const first = parts[0];
  if (!first) {
    return undefined;
  }
  if (first.startsWith("@")) {
    return parts.length > 1 ? `${first}/${parts[1]}` : undefined;
  }
  return first;
}

/**
 * Groups vendor dependencies into long-lived, separately cacheable chunks.
 *
 * Without this the entry chunk absorbs React, MUI and TanStack Query and nearly
 * doubles in size, so an app-only release invalidates all vendor code too.
 * Returning `undefined` defers to Rollup's default chunking, which is the safe
 * fallback for anything not explicitly grouped here.
 *
 * @param id - Rollup module id.
 * @returns The manual chunk name, or `undefined` to defer to Rollup.
 */
export function getFrontendManualChunk(id: string): string | undefined {
  const packageName = getNodeModulesPackageName(id);
  if (!packageName) {
    return undefined;
  }

  if (packageName === "monaco-editor") return "vendor-monaco";
  if (REACT_CORE_PACKAGES.has(packageName)) return "vendor-react";
  if (packageName.startsWith("@mui/") || packageName.startsWith("@emotion/")) return "vendor-mui";
  if (packageName === "@tanstack/react-query") return "vendor-tanstack";
  if (packageName.startsWith("@xyflow/")) return "vendor-xyflow";

  return undefined;
}

/** Short git commit hash for build identification. */
const gitCommit = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
})();

/** Build timestamp in MM/DD/YYYY HH:MM format. */
const buildDate = (() => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
})();

/**
 * Vite plugin that removes `crossorigin` attributes from `<script>` and `<link>` tags
 * in the generated HTML. The `tauri://` protocol used by Tauri does not support the
 * `crossorigin` attribute, and Vite adds it by default to all module scripts and preload links.
 */
function stripCrossoriginPlugin(): import("vite").Plugin {
  return {
    name: "strip-crossorigin",
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(=["'][^"']*["'])?/gi, "");
    },
  };
}

/**
 * Vite build configuration for the React frontend.
 * Dev server runs on port 3000 and proxies /api requests to the sqlui-server on port 3001.
 * @param {{ command: string }} env - Vite config environment with the current command ("serve" or "build").
 * @returns {import('vite').UserConfig} The resolved Vite configuration object.
 */
export default defineConfig(({ command }) => ({
  plugins: [react(), stripCrossoriginPlugin()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(gitCommit),
    __BUILD_CHANNEL__: JSON.stringify(process.env.BUILD_CHANNEL || "dev"),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  root: ".",
  base: command === "serve" ? "/" : "./",
  publicDir: "public",
  envFile: false,
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
      // Bypass the NODE_ENV !== 'development' check in the default export
      // so React Query DevTools can be toggled in packaged/production builds.
      "@tanstack/react-query-devtools": path.resolve(__dirname, "node_modules/@tanstack/react-query-devtools/build/modern/production.js"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["@emotion/react", "@emotion/styled", "@mui/icons-material", "@mui/lab", "@mui/material"],
    esbuildOptions: {
      resolveExtensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
      mainFields: ["main", "module"],
    },
  },
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return getFrontendManualChunk(id);
        },
      },
    },
  },
}));
