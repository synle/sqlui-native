import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildEmbeddedAssetMap } from "./vite-plugin-embed-frontend";

describe("buildEmbeddedAssetMap", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "embed-spec-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Helper to create files at relative paths inside the tmp dir. */
  function writeFile(rel: string, content: string) {
    const full = path.join(tmpDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  test("encodes top-level files as base64 keyed by relative path", () => {
    writeFile("index.html", "<!doctype html><body>hi</body>");
    writeFile("favicon.ico", "binary");

    const map = buildEmbeddedAssetMap(tmpDir);
    expect(Object.keys(map).sort()).toEqual(["favicon.ico", "index.html"]);
    expect(Buffer.from(map["index.html"], "base64").toString("utf-8")).toBe("<!doctype html><body>hi</body>");
  });

  test("recurses into subdirectories with forward-slash keys", () => {
    writeFile("assets/index-abc.js", "console.log(1)");
    writeFile("assets/style.css", "body{color:red}");

    const map = buildEmbeddedAssetMap(tmpDir);
    expect(Object.keys(map).sort()).toEqual(["assets/index-abc.js", "assets/style.css"]);
  });

  test("skips dotfiles and *.map source maps", () => {
    writeFile("index.html", "html");
    writeFile(".DS_Store", "junk");
    writeFile("assets/index-abc.js", "code");
    writeFile("assets/index-abc.js.map", "{}");

    const map = buildEmbeddedAssetMap(tmpDir);
    expect(Object.keys(map).sort()).toEqual(["assets/index-abc.js", "index.html"]);
  });

  test("skips sibling sqlui-server*.{js,json} to avoid self-embedding", () => {
    // Simulates the sidecar build where sqlui-server.js + sqlui-server-assets.json
    // live alongside the frontend output and would otherwise get included.
    writeFile("index.html", "html");
    writeFile("sqlui-server.js", "module.exports={}");
    writeFile("sqlui-server-assets.json", "{}");
    writeFile("sqlui-server.js.map", "{}"); // also covered by .map filter

    const map = buildEmbeddedAssetMap(tmpDir);
    expect(Object.keys(map)).toEqual(["index.html"]);
  });

  test("does not descend into node_modules", () => {
    writeFile("index.html", "html");
    writeFile("node_modules/express/index.js", "/* huge dep */");
    writeFile("node_modules/.package-lock.json", "{}");

    const map = buildEmbeddedAssetMap(tmpDir);
    expect(Object.keys(map)).toEqual(["index.html"]);
  });

  test("returns an empty map when the directory does not exist", () => {
    const map = buildEmbeddedAssetMap(path.join(tmpDir, "missing"));
    expect(map).toEqual({});
  });
});
