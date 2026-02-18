import { defineConfig } from 'vite';
import path from 'path';

const nativeExternals = [
  'electron',
  'sqlite3',
  'cassandra-driver',
  'pg-native',
  'sequelize',
  'mysql2',
  'mariadb',
  'pg',
  'pg-hstore',
  'tedious',
  'mongodb',
  'redis',
];

export default defineConfig({
  build: {
    outDir: 'build',
    emptyOutDir: false,
    ssr: 'src/electron/index.ts',
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        format: 'cjs',
      },
      external: nativeExternals,
    },
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      typings: path.resolve(__dirname, 'typings'),
    },
  },
});
