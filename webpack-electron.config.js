const path = require("path");
const webpack = require("webpack");

module.exports = {
  mode: "production",
  target: ["node"],
  entry: "./main.ts",
  output: {
    filename: "main.js",
    libraryTarget: "this",
    path: path.resolve(__dirname, "./"),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
