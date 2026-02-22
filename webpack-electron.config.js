const path = require("path");
const webpack = require("webpack");
const appPackage = require("./package.json");

// Only externalize packages with native bindings that webpack cannot
// bundle. Everything else (pure JS) gets bundled by webpack.
const nativeExternals = [
  "electron",
  "cassandra-driver",
  "monaco-editor",
  "mongodb",
  "mustache",
  "mysql2",
  "pg",
  "pg-hstore",
  "redis",
  "sequelize",
  "sqlite3",
  "tedious",
];
const externals = {};
for (const dep of nativeExternals) {
  externals[dep] = `commonjs ${dep}`;
}

module.exports = {
  mode: "production",
  target: ["node"],
  entry: "./src/electron/index.ts",
  output: {
    filename: "main.js",
    libraryTarget: "this",
    path: path.resolve(__dirname, "build"),
  },
  externals,
  plugins: [
    // @typespec/ts-http-runtime (used by @azure/data-tables) references the
    // global `crypto` object (Web Crypto API). Provide Node's crypto module
    // so the bundled code can resolve it.
    new webpack.ProvidePlugin({
      crypto: "crypto",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig-electron.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp)$/,
        type: "asset/inline",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      src: path.resolve(__dirname, "src"),
      electron: path.resolve(__dirname, "electron"),
      typings: path.resolve(__dirname, "typings"),
    },
  },
};
