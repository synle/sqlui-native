import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { execSync } from "node:child_process";

const REACT_CORE_CHUNK =
  /\/node_modules\/(react(\/|$)|react-dom|react-is|scheduler|use-sync-external-store|react-router|react-router-dom)\//;

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
          const normalizedId = id.replace(/\\/g, "/");
          if (!normalizedId.includes("/node_modules/")) {
            return;
          }
          if (normalizedId.includes("/node_modules/monaco-editor/")) return "vendor-monaco";
          if (REACT_CORE_CHUNK.test(normalizedId)) return "vendor-react";
          if (normalizedId.includes("/node_modules/@mui/") || normalizedId.includes("/node_modules/@emotion/")) return "vendor-mui";
          if (normalizedId.includes("/node_modules/@tanstack/react-query")) return "vendor-tanstack";
          if (normalizedId.includes("/node_modules/reactflow/") || normalizedId.includes("/node_modules/@xyflow/")) return "vendor-xyflow";
        },
      },
    },
  },
}));
