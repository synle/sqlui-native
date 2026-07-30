import { describe, expect, it } from "vitest";
import { getFrontendManualChunk, getNodeModulesPackageName } from "./vite.frontend.config";

const NODE_MODULES = "/repo/node_modules";

describe("getNodeModulesPackageName", () => {
  it("resolves unscoped packages", () => {
    expect(getNodeModulesPackageName(`${NODE_MODULES}/react/index.js`)).toBe("react");
    expect(getNodeModulesPackageName(`${NODE_MODULES}/react/cjs/react.production.js`)).toBe("react");
    expect(getNodeModulesPackageName(`${NODE_MODULES}/react-dom/client.js`)).toBe("react-dom");
  });

  it("resolves scoped packages", () => {
    expect(getNodeModulesPackageName(`${NODE_MODULES}/@mui/material/Button/index.js`)).toBe("@mui/material");
    expect(getNodeModulesPackageName(`${NODE_MODULES}/@tanstack/react-query/build/index.js`)).toBe("@tanstack/react-query");
  });

  it("resolves the innermost package for nested and pnpm installs", () => {
    expect(getNodeModulesPackageName(`${NODE_MODULES}/@mui/material/node_modules/react-is/index.js`)).toBe("react-is");
    expect(getNodeModulesPackageName(`${NODE_MODULES}/.pnpm/react@19.2.5/node_modules/react/index.js`)).toBe("react");
  });

  it("normalizes Windows path separators", () => {
    expect(getNodeModulesPackageName("C:\\repo\\node_modules\\react\\index.js")).toBe("react");
    expect(getNodeModulesPackageName("C:\\repo\\node_modules\\@mui\\material\\index.js")).toBe("@mui/material");
  });

  it("returns undefined for first-party sources and malformed scoped ids", () => {
    expect(getNodeModulesPackageName("/repo/src/frontend/index.tsx")).toBeUndefined();
    expect(getNodeModulesPackageName("\0vite/preload-helper")).toBeUndefined();
    expect(getNodeModulesPackageName(`${NODE_MODULES}/@mui`)).toBeUndefined();
  });
});

describe("getFrontendManualChunk", () => {
  it("keeps every React core package in one chunk", () => {
    // Splitting these apart creates a circular chunk import that leaves React's
    // namespace undefined at init time and hard-fails app boot. See the module docs.
    const reactCoreIds = [
      `${NODE_MODULES}/react/index.js`,
      `${NODE_MODULES}/react/jsx-runtime.js`,
      `${NODE_MODULES}/react/cjs/react.production.js`,
      `${NODE_MODULES}/react-dom/client.js`,
      `${NODE_MODULES}/react-dom/cjs/react-dom-client.production.js`,
      `${NODE_MODULES}/react-is/index.js`,
      `${NODE_MODULES}/scheduler/index.js`,
      `${NODE_MODULES}/use-sync-external-store/shim/index.js`,
      `${NODE_MODULES}/react-router/dist/development/index.mjs`,
    ];

    const chunks = new Set(reactCoreIds.map((id) => getFrontendManualChunk(id)));
    expect([...chunks]).toEqual(["vendor-react"]);
  });

  it("groups the remaining heavy vendors into their own chunks", () => {
    expect(getFrontendManualChunk(`${NODE_MODULES}/monaco-editor/esm/vs/editor.api.js`)).toBe("vendor-monaco");
    expect(getFrontendManualChunk(`${NODE_MODULES}/@mui/material/index.js`)).toBe("vendor-mui");
    expect(getFrontendManualChunk(`${NODE_MODULES}/@emotion/react/dist/emotion-react.esm.js`)).toBe("vendor-mui");
    expect(getFrontendManualChunk(`${NODE_MODULES}/@tanstack/react-query/build/modern/index.js`)).toBe("vendor-tanstack");
    expect(getFrontendManualChunk(`${NODE_MODULES}/@xyflow/react/dist/esm/index.js`)).toBe("vendor-xyflow");
  });

  it("does not conflate packages that merely share a name prefix", () => {
    expect(getFrontendManualChunk(`${NODE_MODULES}/react-transition-group/esm/index.js`)).toBeUndefined();
    expect(getFrontendManualChunk(`${NODE_MODULES}/@tanstack/react-query-devtools/build/index.js`)).toBeUndefined();
    expect(getFrontendManualChunk(`${NODE_MODULES}/monaco-to-editor-webpack-plugin/index.js`)).toBeUndefined();
  });

  it("leaves first-party sources to Rollup's default chunking", () => {
    expect(getFrontendManualChunk("/repo/src/frontend/App.tsx")).toBeUndefined();
  });
});
