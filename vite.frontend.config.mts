import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getFrontendManualChunk, resolveBuildTarget } from "./vite.frontend.helpers.mts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Short git commit hash for build identification. */
const gitCommit = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
})();

/** Platform this frontend bundle is being built for; empty outside a Tauri build. */
const buildTarget = resolveBuildTarget();

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
 * Removes crossorigin attributes from generated HTML for Tauri protocol compatibility.
 * @returns Vite plugin that strips crossorigin attributes from script and link tags.
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
 * Configures the React frontend build and development API proxy.
 * @param configEnv - Vite config environment with the current command ("serve" or "build").
 * @returns The resolved Vite user configuration.
 */
export default defineConfig((configEnv) => ({
  plugins: [react(), stripCrossoriginPlugin()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(gitCommit),
    __BUILD_CHANNEL__: JSON.stringify(process.env.BUILD_CHANNEL || "dev"),
    __BUILD_DATE__: JSON.stringify(buildDate),
    __BUILD_TARGET_OS__: JSON.stringify(buildTarget.os),
    __BUILD_TARGET_ARCH__: JSON.stringify(buildTarget.arch),
  },
  root: ".",
  base: configEnv.command === "serve" ? "/" : "./",
  publicDir: "public",
  envDir: false,
  resolve: {
    alias: {
      src: path.resolve(rootDir, "src"),
      // Bypass the NODE_ENV !== 'development' check in the default export
      // so React Query DevTools can be toggled in packaged/production builds.
      "@tanstack/react-query-devtools": path.resolve(rootDir, "node_modules/@tanstack/react-query-devtools/build/modern/production.js"),
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
    rolldownOptions: {
      resolve: {
        extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
        mainFields: ["main", "module"],
      },
    },
  },
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: false,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          return getFrontendManualChunk(id);
        },
      },
    },
  },
}));
