import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

describe("Tauri packaging safeguards", () => {
  describe("server.ts multer configuration", () => {
    const serverSource = readFile("src/sqlui-server/server.ts");

    test("should use os.tmpdir for multer dest, not a relative path", () => {
      // Relative paths like "./upload" fail in read-only app bundles
      expect(serverSource).toContain("os.tmpdir()");
      expect(serverSource).not.toMatch(/multer\(\{\s*dest:\s*["']\.\//);
    });
  });

  describe("prebuild.js build artifacts", () => {
    const prebuild = readFile("scripts/prebuild.js");

    test("should symlink node_modules into build/", () => {
      expect(prebuild).toContain("node_modules");
      expect(prebuild).toContain("symlinkSync");
    });

    test("should copy package.json into src/ for frontend import", () => {
      expect(prebuild).toContain('cpSync("package.json", "src/package.json")');
    });
  });

  describe("tauri.conf.json", () => {
    const tauriConf = JSON.parse(readFile("src-tauri/tauri.conf.json"));

    test("should bundle resources/ into the app", () => {
      expect(tauriConf.bundle.resources).toBeDefined();
      expect(tauriConf.bundle.resources["resources/"]).toBe("resources/");
    });

    test("should have CSP allowing sidecar HTTP connections", () => {
      expect(tauriConf.app.security.csp).toContain("http://127.0.0.1:*");
    });

    test("should allow GitHub API for update checks", () => {
      expect(tauriConf.app.security.csp).toContain("https://api.github.com");
    });
  });

  describe("prepare-sidecar.js", () => {
    const prepareSidecar = readFile("scripts/prepare-sidecar.js");

    test("should copy sqlui-server.js to resources/", () => {
      expect(prepareSidecar).toContain("sqlui-server.js");
      expect(prepareSidecar).toContain("RESOURCES_DIR");
    });

    test("should copy bundled node binary to resources/", () => {
      expect(prepareSidecar).toContain("node");
      expect(prepareSidecar).toContain("BINARIES_DIR");
    });
  });

  describe("vite.sqlui-server.sidecar.config.ts", () => {
    const sidecarConfig = readFile("vite.sqlui-server.sidecar.config.ts");

    test("should output a single bundled sqlui-server.js", () => {
      expect(sidecarConfig).toContain("sqlui-server.js");
      expect(sidecarConfig).toContain("inlineDynamicImports");
    });

    test("should use CJS format for Node.js sidecar", () => {
      expect(sidecarConfig).toContain('"cjs"');
    });

    test("should minify for smaller sidecar bundle", () => {
      expect(sidecarConfig).toContain("minify: true");
    });
  });

  describe("lib.rs sidecar launcher", () => {
    const libRs = readFile("src-tauri/src/lib.rs");

    test("should check for bundled node before system node", () => {
      expect(libRs).toContain("bundled_node");
      expect(libRs).toContain("find_system_node");
    });

    test("should read port from sidecar stdout marker", () => {
      expect(libRs).toContain("__SIDECAR_PORT__=");
    });

    test("should kill sidecar on app exit", () => {
      expect(libRs).toContain("kill_sidecar");
      expect(libRs).toContain("ExitRequested");
    });

    test("should bind sidecar to SIDECAR_PORT=0 for dynamic port", () => {
      expect(libRs).toContain('"SIDECAR_PORT"');
      expect(libRs).toContain('"0"');
    });
  });

  describe("package.json scripts", () => {
    const pkg = JSON.parse(readFile("package.json"));

    test("should have build:tauri that runs sidecar bundle and prepare", () => {
      expect(pkg.scripts["build:tauri"]).toContain("build-server-sidecar");
      expect(pkg.scripts["build:tauri"]).toContain("prepare-sidecar.js");
    });

    test("should have build:tauri that downloads node", () => {
      expect(pkg.scripts["build:tauri"]).toContain("download-node.js");
    });

    test("npm start should run tauri:dev", () => {
      expect(pkg.scripts.start).toContain("tauri");
    });
  });
});
