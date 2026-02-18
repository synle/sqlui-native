import { defineConfig } from 'vite';
import path from 'path';
import appPackage from './package.json';

const externalDeps = [
  'electron',
  ...Object.keys(appPackage.dependencies || {}),
  ...Object.keys(appPackage.optionalDependencies || {}),
];

export default defineConfig({
  build: {
    outDir: 'build',
    emptyOutDir: false,
    ssr: 'src/mocked-server/index.ts',
    rollupOptions: {
      output: {
        entryFileNames: 'mocked-server.js',
        format: 'cjs',
      },
      external: externalDeps,
    },
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      typings: path.resolve(__dirname, 'typings'),
    },
  },
});
