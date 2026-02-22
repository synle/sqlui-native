module.exports = {
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true,
  },
  globals: {
    JSX: "readonly",
    React: "readonly",
    Electron: "readonly",
    RequestInit: "readonly",
    RequestInfo: "readonly",
    HTMLTextAreaElement: "readonly",
  },
  extends: ["eslint:recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 11,
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint", "unused-imports"],
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    "no-debugger": ["warn"],
    "no-empty": ["error", { allowEmptyCatch: true }],
  },
};
