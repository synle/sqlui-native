const path = require('path');
const webpack = require('webpack');
const appPackage = require('./package.json');

const externals = {};
const externalsDeps = [
  'electron',
  ...Object.keys(appPackage.optionalDependencies || []),
  ...Object.keys(appPackage.dependencies|| [])
];
for(const dep of externalsDeps){
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
