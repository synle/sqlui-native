const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  target: ['node'],
  entry: './src/mocked-server/index.ts',
  output: {
    filename: 'mocked-server.js',
    libraryTarget: 'this',
    path: path.resolve(__dirname, 'build'),
  },
  externals: {
    electron: 'commonjs electron',
    'react-router-dom': 'commonjs react-router-dom',
    sequelize: 'commonjs sequelize',
    mongodb: 'commonjs mongodb',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig-mocked-server.json',
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
