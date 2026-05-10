/** Entry point for the sqlui-server. Starts Express on localhost with graceful shutdown. */
import { execSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { app, initializeEndpoints, mountStaticAssets, port as defaultPort } from "src/sqlui-server/server";

initializeEndpoints();

// ---------------------------------------------------------------------------
// Optional static-asset serving — when a sibling `sqlui-server-assets.json` is
// present (emitted by vite.sqlui-server.sidecar.config.ts), the server can serve
// the React UI in addition to /api routes. This is the same code path the
// portal entry uses, just sharing one server binary.
//
// In dev (vite.sqlui-server.config.ts has no embed plugin), the JSON sibling
// won't exist and this is a no-op — Tauri continues using `frontendDist` and
// the dev Vite server hosts the UI separately.
// ---------------------------------------------------------------------------

/**
 * Decodes the embedded asset map (if present) into a per-PID temp dir and
 * returns the directory path. Returns null when no assets are embedded.
 */
function extractEmbeddedAssetsIfPresent(): string | null {
  const candidate = path.join(__dirname, "sqlui-server-assets.json");
  if (!fs.existsSync(candidate)) return null;

  try {
    const map = JSON.parse(fs.readFileSync(candidate, "utf-8")) as Record<string, string>;
    if (Object.keys(map).length === 0) return null;

    const outDir = path.join(os.tmpdir(), `sqlui-server-${process.pid}`);
    fs.mkdirSync(outDir, { recursive: true });
    for (const [rel, base64] of Object.entries(map)) {
      const full = path.join(outDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, Buffer.from(base64, "base64"));
    }

    const cleanup = () => {
      try {
        fs.rmSync(outDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    };
    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    return outDir;
  } catch (err) {
    console.error("index.ts:extractEmbeddedAssetsIfPresent", err);
    return null;
  }
}

const embeddedAssetsDir = extractEmbeddedAssetsIfPresent();
if (embeddedAssetsDir) {
  mountStaticAssets(embeddedAssetsDir);
}

/** Host to bind to — loopback only, no firewall prompt. */
const HOST = "127.0.0.1";

/**
 * Checks if a port is already in use on the given host.
 * @param targetPort - The port number to check.
 * @param host - The host address to check.
 * @returns Promise that resolves to true if the port is in use.
 */
function isPortInUse(targetPort: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: targetPort, host }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Attempts to kill any process occupying the given port.
 * Uses lsof on macOS/Linux and netstat on Windows.
 * @param targetPort - The port to free up.
 */
function killProcessOnPort(targetPort: number): void {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${targetPort} | findstr LISTENING`, { encoding: "utf-8" });
      const pid = output.trim().split(/\s+/).pop();
      if (pid && pid !== "0") {
        execSync(`taskkill /PID ${pid} /F`);
        console.log(`Killed stale process PID ${pid} on port ${targetPort}`);
      }
    } else {
      execSync(`lsof -ti tcp:${targetPort} | xargs kill -9 2>/dev/null`);
      console.log(`Killed stale process on port ${targetPort}`);
    }
  } catch (_err) {
    // no process found or kill failed — safe to proceed
  }
}

/**
 * Gracefully shuts down the HTTP server and exits the process.
 * @param server - The HTTP server instance to close.
 * @param signal - The signal or reason for shutdown.
 */
function gracefulShutdown(server: net.Server, signal: string): void {
  console.log(`\nReceived ${signal}, shutting down server...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });

  // force exit if graceful close takes too long
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 5000);
}

/**
 * Starts the server as a Tauri sidecar.
 * Listens on a random port (0) and prints the port marker for the Rust host to read.
 * Monitors stdin — when the parent Tauri process exits, stdin closes and the sidecar shuts down.
 */
function startSidecar(): void {
  const server = app.listen(0, HOST, () => {
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    // The Rust host reads this exact marker from stdout to discover the port
    console.log(`__SIDECAR_PORT__=${port}`);
    console.log(`SQLUI Native Server (sidecar) started on http://${HOST}:${port} (pid: ${process.pid})`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error("Sidecar server error:", err);
    process.exit(1);
  });

  // Detect parent death: when Tauri exits, stdin closes
  process.stdin.resume();
  process.stdin.on("end", () => gracefulShutdown(server, "stdin closed (parent exited)"));
  process.on("SIGTERM", () => gracefulShutdown(server, "SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown(server, "SIGINT"));
}

/**
 * Starts the server in standalone mode.
 * Uses the default port (3001) with port conflict detection and cleanup.
 */
async function startStandalone(): Promise<void> {
  const inUse = await isPortInUse(defaultPort, HOST);
  if (inUse) {
    console.log(`Port ${defaultPort} is in use, killing stale process...`);
    killProcessOnPort(defaultPort);
    // brief pause for the OS to release the port
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const server = app.listen(defaultPort, HOST, () => {
    console.log(`SQLUI Native Server started on http://${HOST}:${defaultPort} (pid: ${process.pid})`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${defaultPort} is still in use after cleanup. Exiting.`);
      process.exit(1);
    }
    console.error("Server error:", err);
  });

  process.on("SIGTERM", () => gracefulShutdown(server, "SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown(server, "SIGINT"));
}

// SIDECAR_PORT=0 is set by the Tauri Rust host when spawning the sidecar
if (process.env.SIDECAR_PORT === "0") {
  startSidecar();
} else {
  startStandalone();
}
