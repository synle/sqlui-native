import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vite build configuration for the React frontend.
 * Dev server runs on port 3000. In Tauri dev mode, the Rust backend handles all API calls via invoke().
 * @param {{ command: string }} env - Vite config environment with the current command ("serve" or "build").
 * @returns {import('vite').UserConfig} The resolved Vite configuration object.
 */
export default defineConfig(({ command }) => ({
  plugins: [react()],
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
  },
  preview: {
    port: 3000,
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
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-mui": ["@mui/material", "@mui/icons-material", "@mui/lab"],
          "vendor-tanstack": ["@tanstack/react-query", "@tanstack/react-table", "@tanstack/react-virtual"],
          "vendor-xyflow": ["@xyflow/react"],
        },
      },
    },
  },
}));
