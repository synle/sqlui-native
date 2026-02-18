import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'build',
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      typings: path.resolve(__dirname, 'typings'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [path.resolve(__dirname, 'src/frontend/styles')],
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
