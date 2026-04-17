import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

describe("Electron packaging safeguards", () => {
  describe("vite.electron.config.ts externals", () => {
    const config = readFile("vite.electron.config.ts");

    test("should NOT externalize express (must be bundled into app.js for asar)", () => {
      // express must be bundled because electron-builder's asar doesn't include
      // node_modules for non-externalized deps, causing "Cannot find module 'express'"
      expect(config).not.toMatch(/["']express["']/);
    });

    test("should NOT externalize body-parser (must be bundled into app.js for asar)", () => {
      expect(config).not.toMatch(/["']body-parser["']/);
    });

    test("should NOT externalize multer (must be bundled into app.js for asar)", () => {
      expect(config).not.toMatch(/["']multer["']/);
    });

    test("should NOT externalize better-sqlite3 (replaced by node:sqlite)", () => {
      // node:sqlite is built into Node.js — no native module to externalize
      expect(config).not.toContain("better-sqlite3");
    });

    test("should externalize native modules that cannot be bundled", () => {
      expect(config).toContain("electron");
    });
  });

  describe("server.ts multer configuration", () => {
    const serverSource = readFile("src/sqlui-server/server.ts");

    test("should use os.tmpdir for multer dest, not a relative path", () => {
      // Relative paths like "./upload" fail in read-only asar filesystems
      // causing "EROFS: read-only file system, mkdir '/upload'"
      expect(serverSource).toContain("os.tmpdir()");
      expect(serverSource).not.toMatch(/multer\(\{\s*dest:\s*["']\.\//);
    });
  });

  describe("electron/index.ts production loading", () => {
    const electronSource = readFile("src/electron/index.ts");

    test("should load from file:// in production mode, not server URL", () => {
      // Loading from the embedded HTTP server causes MIME type errors because
      // express.static cannot serve files from inside an asar archive
      expect(electronSource).toContain("mainWindow.loadFile(");
    });

    test("should redirect file:///api/* to embedded server via webRequest", () => {
      // With file:// origin, relative /api/ fetches need to be redirected
      // to the embedded HTTP server on 127.0.0.1
      expect(electronSource).toContain('onBeforeRequest({ urls: ["file:///api/*"] }');
    });

    test("should bind embedded server to 127.0.0.1 only", () => {
      // Binding to 127.0.0.1 prevents firewall prompts on all platforms
      expect(electronSource).toContain('"127.0.0.1"');
    });

    test("should use dynamic port (0) for embedded server", () => {
      // Dynamic port avoids conflicts when multiple instances run
      expect(electronSource).toMatch(/listen\(0,\s*["']127\.0\.0\.1["']/);
    });

    test("should shut down server on app quit", () => {
      expect(electronSource).toContain("shutdownServer()");
      expect(electronSource).toContain('app.on("before-quit"');
    });
  });

  describe("prebuild.js symlinks node_modules into build/", () => {
    const prebuild = readFile("scripts/prebuild.js");

    test("should symlink node_modules into build/ for electron-builder", () => {
      // electron-builder uses directories.app: "build" and needs node_modules
      // there for external dependencies (native modules)
      expect(prebuild).toContain("node_modules");
      expect(prebuild).toContain("symlinkSync");
    });
  });

  describe("package.json electron-builder config", () => {
    const pkg = JSON.parse(readFile("package.json"));

    test("should use build/ as the app directory", () => {
      // electron-builder packages from build/ directly instead of project root,
      // avoiding .gitignore issues and root-level build artifact pollution
      expect(pkg.build.directories.app).toBe("build");
    });

    test("should exclude sqlui-server.js from electron-builder files", () => {
      // The standalone server build should not be in the packaged app
      expect(pkg.build.files).toContain("!sqlui-server.js");
    });
  });
});
