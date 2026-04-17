/** Entry point for the sqlui-server. Starts Express on localhost with graceful shutdown. */
import { execSync } from "node:child_process";
import net from "node:net";
import { app, port } from "src/sqlui-server/server";

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
 * Starts the server after ensuring the port is free.
 */
async function startServer(): Promise<void> {
  const inUse = await isPortInUse(port, HOST);
  if (inUse) {
    console.log(`Port ${port} is in use, killing stale process...`);
    killProcessOnPort(port);
    // brief pause for the OS to release the port
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const server = app.listen(port, HOST, () => {
    console.log(`SQLUI Native Server started on http://${HOST}:${port} (pid: ${process.pid})`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} is still in use after cleanup. Exiting.`);
      process.exit(1);
    }
    console.error("Server error:", err);
  });

  process.on("SIGTERM", () => gracefulShutdown(server, "SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown(server, "SIGINT"));
}

startServer();
