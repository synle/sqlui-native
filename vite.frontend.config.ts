import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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
      "@tanstack/react-query-devtools": path.resolve(__dirname, "node_modules/@tanstack/react-query-devtools/build/lib/index.prod.mjs"),
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
    sourcemap: true,
  },
}));
