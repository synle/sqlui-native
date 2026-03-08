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
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: true,
  },
}));
