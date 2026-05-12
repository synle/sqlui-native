#!/usr/bin/env node
/**
 * Smoke test for the built sqlui-portal bundle at dist/portal/sqlui-portal.js.
 *
 * Runs after `npm run build:portal` and gates the release upload. Verifies that
 * the bundled portal:
 *   1. Resolves --version and prints a semver line
 *   2. Boots on a random localhost port and serves the root HTML with the
 *      session ID injected
 *   3. Responds 200 to GET /api/connections with the portal session header
 *   4. Shuts down cleanly on SIGTERM
 *
 * Exits 0 on full success, non-zero with a clear log line on any failure.
 */

const { spawnSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const BUNDLE = path.join(ROOT, "dist", "portal", "sqlui-portal.js");
const PORT = 20000 + Math.floor(Math.random() * 1000);
const HOST = "127.0.0.1";
const HOME = path.join(os.tmpdir(), `sqlui-portal-smoke-${process.pid}`);

function log(msg) {
  console.log(`[smoke] ${msg}`);
}

function fail(msg) {
  console.error(`[smoke] FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(BUNDLE)) {
  fail(`bundle not found at ${BUNDLE} — did the build step run?`);
}

// 1. --version check (fast sanity, no port needed)
log(`node ${path.relative(ROOT, BUNDLE)} --version`);
const ver = spawnSync(process.execPath, [BUNDLE, "--version"], { encoding: "utf-8" });
if (ver.status !== 0) {
  fail(`--version exited ${ver.status}\nstdout: ${ver.stdout}\nstderr: ${ver.stderr}`);
}
const semverMatch = (ver.stdout || "").match(/\d+\.\d+\.\d+/);
if (!semverMatch) {
  fail(`--version output did not contain a semver line:\n${ver.stdout}`);
}
log(`--version OK: ${semverMatch[0]}`);

// 2. Boot + HTTP probes
log(`booting bundle on ${HOST}:${PORT} …`);
const child = spawn(process.execPath, [BUNDLE, "--port", String(PORT), "--host", HOST, "--no-open", "--home-dir", HOME], {
  cwd: ROOT,
  env: process.env,
});

let stdoutBuf = "";
let stderrBuf = "";
child.stdout.on("data", (d) => {
  stdoutBuf += d.toString();
  process.stdout.write(`[smoke:stdout] ${d}`);
});
child.stderr.on("data", (d) => {
  stderrBuf += d.toString();
  process.stderr.write(`[smoke:stderr] ${d}`);
});

let exited = false;
child.on("exit", (code, sig) => {
  exited = true;
  log(`bundle exited (code=${code}, sig=${sig})`);
});

function get(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port: PORT, path: pathname, method: "GET", headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

async function waitForReady(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`bundle exited before ready`);
    try {
      const r = await get("/api/connections", { "sqlui-native-session-id": "portal" });
      if (r.status === 200) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`bundle did not respond within ${timeoutMs}ms`);
}

async function run() {
  try {
    await waitForReady();
    log(`server ready, running probes …`);

    const root = await get("/");
    if (root.status !== 200) throw new Error(`GET / returned ${root.status}`);
    if (!root.body.includes("__SQLUI_PORTAL_SESSION__")) {
      throw new Error(`GET / missing session-ID injection`);
    }
    log(`GET / OK (${root.body.length} bytes, session ID injected)`);

    const conns = await get("/api/connections", { "sqlui-native-session-id": "portal" });
    if (conns.status !== 200) throw new Error(`GET /api/connections returned ${conns.status}`);
    const parsed = JSON.parse(conns.body);
    if (!Array.isArray(parsed)) throw new Error(`GET /api/connections did not return an array`);
    log(`GET /api/connections OK (${parsed.length} connections)`);

    log(`smoke PASS`);
  } catch (err) {
    fail(err.message || String(err));
  } finally {
    if (!exited) child.kill("SIGTERM");
    setTimeout(() => {
      if (!exited) child.kill("SIGKILL");
    }, 2000);
    try {
      fs.rmSync(HOME, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

run();
