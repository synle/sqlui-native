/** Entry point for the sqlui-server. Starts Express on localhost with graceful shutdown. */
import { execSync } from "node:child_process";
import net from "node:net";
import { app, initializeEndpoints, port as defaultPort } from "src/sqlui-server/server";

initializeEndpoints();

/** Host to bind to — loopback only, no firewall prompt. */
const HOST = "127.0.0.1";

/** True when launched as a Tauri sidecar (SIDECAR_PORT env var is set). */
const isSidecarMode = process.env.SIDECAR_PORT !== undefined;

/**
 * Returns a random port in the ephemeral/high range (49152-65535).
 * These ports are unlikely to conflict with well-known services.
 */
function getRandomHighPort(): number {
  return 49152 + Math.floor(Math.random() * (65535 - 49152));
}

/**
 * Checks whether a given port is available for binding on 127.0.0.1.
 * @param targetPort - The port number to test.
 * @returns True if the port is free, false if already in use.
 */
function isPortAvailable(targetPort: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(targetPort, HOST);
  });
}

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
 * Starts the server in sidecar mode for Tauri.
 * Uses SIDECAR_PORT env var, a random high port, or OS-assigned port.
 * Prints __SIDECAR_PORT__=<port> to stdout for the parent process to read.
 * Detects parent process death via stdin close.
 */
async function startSidecar(): Promise<void> {
  let port: number;

  if (process.env.SIDECAR_PORT) {
    port = parseInt(process.env.SIDECAR_PORT, 10);
  } else {
    port = getRandomHighPort();
    if (!(await isPortAvailable(port))) {
      port = 0; // fallback: let OS assign a free port
    }
  }

  const server = app.listen(port, HOST, () => {
    const addr = server.address();
    const actualPort = typeof addr === "object" && addr !== null ? addr.port : port;
    console.log(`__SIDECAR_PORT__=${actualPort}`);
  });

  /** Gracefully shuts down the HTTP server and exits. */
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Detect parent process death: stdin closes when Tauri exits or crashes
  process.stdin.resume();
  process.stdin.on("end", shutdown);
}

/**
 * Starts the server in standalone mode (dev/legacy).
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

if (isSidecarMode) {
  startSidecar();
} else {
  startStandalone();
}
