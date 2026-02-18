const path = require('path');
const webpack = require('webpack');
const appPackage = require('./package.json');

// Only externalize packages that contain native bindings or use
// dynamic require() patterns. Everything else (pure JS) gets bundled
// by webpack, avoiding missing transitive dependency issues in
// electron-builder packaging.
const nativeExternals = [
  'electron',
  // Native modules
  'sqlite3',
  'cassandra-driver',
  'pg-native',
  // Sequelize + drivers use dynamic require() to load dialects at runtime
  'sequelize',
  'mysql2',
  'mariadb',
  'pg',
  'pg-hstore',
  'tedious',
  // MongoDB uses dynamic require() for optional deps
  'mongodb',
  // Redis has native optional bindings
  'redis',
];
const externals = {};
for (const dep of nativeExternals) {
  externals[dep] = `commonjs ${dep}`;
}

module.exports = {
  mode: 'production',
  target: ['node'],
  entry: './src/electron/index.ts',
  output: {
    filename: 'main.js',
    libraryTarget: 'this',
    path: path.resolve(__dirname, 'build'),
  },
  externals,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig-electron.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      src: path.resolve(__dirname, 'src'),
      electron: path.resolve(__dirname, 'electron'),
      typings: path.resolve(__dirname, 'typings'),
    },
  },
};
