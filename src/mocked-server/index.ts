import net from "node:net";
import { app } from "src/mocked-server/mocked-server";

/**
 * Returns a random port in the ephemeral/high range (49152-65535).
 * These ports are unlikely to conflict with well-known services.
 */
function getRandomHighPort(): number {
  return 49152 + Math.floor(Math.random() * (65535 - 49152));
}

/**
 * Checks whether a given port is available for binding on 127.0.0.1.
 * @param port - The port number to test.
 * @returns True if the port is free, false if already in use.
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Starts the Express sidecar server on a random high port (or a fixed port via SIDECAR_PORT env var).
 * Prints the assigned port to stdout for the parent process (Tauri) to read.
 * Listens for SIGTERM, SIGINT, and stdin close (parent crash) for graceful shutdown.
 */
async function start() {
  let port: number;

  if (process.env.SIDECAR_PORT) {
    port = parseInt(process.env.SIDECAR_PORT, 10);
  } else {
    port = getRandomHighPort();
    if (!(await isPortAvailable(port))) {
      port = 0; // fallback: let OS assign a free port
    }
  }

  const server = app.listen(port, "127.0.0.1", () => {
    const addr = server.address();
    const actualPort = typeof addr === "object" && addr !== null ? addr.port : port;
    console.log(`__SIDECAR_PORT__=${actualPort}`);
  });

  /** Gracefully shuts down the HTTP server and exits. */
  const shutdown = () => {
    server.close(() => process.exit(0));
    // Force exit after 3s if connections linger
    setTimeout(() => process.exit(0), 3000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Detect parent process death: stdin closes when Tauri exits or crashes
  process.stdin.resume();
  process.stdin.on("end", shutdown);
}

start();
