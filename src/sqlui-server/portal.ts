/**
 * Portal mode entry — exposes the sqlui-native webapp like phpMyAdmin / sqlite-web.
 *
 * Boots a single self-contained server that:
 *  - Persists state to `~/.sqlui-portal` (isolated from the desktop app's `~/.sqlui-native`)
 *  - Serves the bundled React frontend AND the /api routes from one port
 *  - Accepts any number of dialect-prefixed connection strings (or plain SQLite paths)
 *    as positional CLI args, dedupes against existing connections, and adds them to
 *    a fixed "portal" session
 *  - Auto-opens the browser to the running URL
 *
 * **Critical ordering:** This file sets `process.env.SQLUI_HOME_DIR` BEFORE
 * importing any modules that read from `~/.sqlui-native`, so `PersistentStorageJsonFile`
 * resolves its `baseDir` to the portal directory.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { getDialectTypeFromConnectionString } from "src/common/adapters/DataScriptFactory";

// ---------------------------------------------------------------------------
// 1. Storage isolation — must run before any storage import.
// ---------------------------------------------------------------------------
if (!process.env.SQLUI_HOME_DIR) {
  process.env.SQLUI_HOME_DIR = path.join(os.homedir(), ".sqlui-portal");
}

// ---------------------------------------------------------------------------
// 2. Asset extraction — must run before mountStaticAssets() reads from disk.
// ---------------------------------------------------------------------------
/**
 * Loads the embedded frontend asset map (relative path → base64) from a sibling
 * `sqlui-portal-assets.json` file emitted next to the bundle by the portal
 * build. We read it from disk at startup rather than inlining into the JS
 * bundle — Vite's `define` chokes on multi-MB literals and expands them by ~40x
 * during minification.
 *
 * Returns `{}` in dev (no sibling file) so the dev-fallback assets dir kicks in.
 */
function loadEmbeddedAssets(): Record<string, string> {
  const candidate = path.join(__dirname, "sqlui-portal-assets.json");
  try {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, "utf-8")) as Record<string, string>;
    }
  } catch (err) {
    console.error("portal.ts:loadEmbeddedAssets", err);
  }
  return {};
}

const embeddedAssets: Record<string, string> = loadEmbeddedAssets();

/**
 * Returns the directory holding `index.html` + `assets/` to serve.
 * In a packaged portal bundle the assets are extracted to a per-PID temp dir;
 * in dev (when running the unbundled server directly) we fall back to `build/`.
 */
function resolveAssetsDir(): string {
  const keys = Object.keys(embeddedAssets);
  if (keys.length === 0) {
    // dev fallback — the standalone build emits frontend bundle into ./build/
    return path.resolve(__dirname, "..");
  }

  const outDir = path.join(os.tmpdir(), `sqlui-portal-${process.pid}`);
  fs.mkdirSync(outDir, { recursive: true });
  for (const relPath of keys) {
    const full = path.join(outDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from(embeddedAssets[relPath], "base64"));
  }

  // best-effort cleanup on exit
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
}

// ---------------------------------------------------------------------------
// 3. Now safe to import server modules (storage will resolve to portal dir).
// ---------------------------------------------------------------------------

import { app, initializeEndpoints, mountStaticAssets } from "src/sqlui-server/server";
import { getConnectionsStorage, getSessionsStorage } from "src/common/PersistentStorage";
import { SqluiCore } from "typings";

/** Fixed session ID used by every request in portal mode. */
const PORTAL_SESSION_ID = "portal";

/** Display name for the auto-created portal session. */
const PORTAL_SESSION_NAME = "Portal";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

/**
 * Default port for the portal. Picked to avoid collisions with common dev tools
 * (3000/3001/4000/5173/8080/8000/9000/etc). 19378 is in IANA's user-port range,
 * not registered to any well-known service.
 */
const DEFAULT_PORTAL_PORT = 19378;

/** Parsed CLI options for portal mode. */
type PortalOptions = {
  port: number;
  host: string;
  open: boolean;
  inputs: string[];
  help: boolean;
};

/**
 * Parses argv into PortalOptions.
 * Recognized flags:
 *   --port <n> / -p <n>   listen port (default 19378; falls back to random if busy)
 *   --host <h>            bind host (default 127.0.0.1; use 0.0.0.0 to expose on LAN)
 *   --no-open             don't auto-open the browser
 *   --help / -h           print usage
 * Everything else is treated as a positional connection input.
 */
function parseArgs(argv: string[]): PortalOptions {
  const opts: PortalOptions = {
    port: DEFAULT_PORTAL_PORT,
    host: "127.0.0.1",
    open: true,
    inputs: [],
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--port" || arg === "-p") {
      const n = parseInt(argv[++i] ?? "", 10);
      if (Number.isFinite(n) && n >= 0) opts.port = n;
    } else if (arg === "--host") {
      const h = argv[++i];
      if (h) opts.host = h;
    } else if (arg === "--no-open") {
      opts.open = false;
    } else if (arg === "--open") {
      opts.open = true;
    } else if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
    } else {
      opts.inputs.push(arg);
    }
  }
  return opts;
}

/** Prints CLI usage to stdout. */
function printHelp(): void {
  console.log(
    [
      "sqlui-portal — open a SQL/NoSQL connection in your browser",
      "",
      "Usage:",
      "  sqlui-portal [options] [connection...]",
      "",
      "Options:",
      `  --port <n>     listen port (default ${DEFAULT_PORTAL_PORT}; falls back to random if busy; 0 = random)`,
      "  --host <host>  bind host (default 127.0.0.1; 0.0.0.0 exposes on LAN)",
      "  --no-open      don't auto-open the browser",
      "  -h, --help     show this help",
      "",
      "Connection inputs (any number, deduped):",
      "  ./mydata.sqlite                         (path → sqlite)",
      "  sqlite:///absolute/path/to/db.sqlite",
      "  postgres://user:pass@host:5432/db",
      "  mysql://user:pass@host:3306/db",
      "  mongodb://user:pass@host:27017",
      "  redis://host:6379",
      "  mssql://user:pass@host:1433",
      "  cassandra://user:pass@host:9042",
      "",
      "All inputs are added to a single 'Portal' session in ~/.sqlui-portal/.",
      "Running with the same input twice does NOT create a duplicate.",
    ].join("\n"),
  );
}

// ---------------------------------------------------------------------------
// Connection input → connection string normalization
// ---------------------------------------------------------------------------

// Pure helpers live in src/sqlui-server/portalHelpers.ts so they can be unit-tested
// without triggering portal.ts's IIFE main (which would actually start a server).
import { normalizeConnectionInput, deriveConnectionName } from "src/sqlui-server/portalHelpers";

// ---------------------------------------------------------------------------
// Bootstrap: ensure portal session + dedupe-add the inputs
// ---------------------------------------------------------------------------

/**
 * Ensures the fixed 'portal' session exists, then adds each input as a connection
 * IF (and only if) no connection with the same connection string already exists
 * in the portal session. Idempotent — running twice with the same input is a no-op.
 *
 * @returns The number of new connections added (existing dupes are skipped).
 */
async function bootstrapConnections(rawInputs: string[]): Promise<number> {
  // 1) Make sure the portal session row exists.
  const sessions = await getSessionsStorage();
  if (!sessions.get(PORTAL_SESSION_ID)) {
    sessions.add({ id: PORTAL_SESSION_ID, name: PORTAL_SESSION_NAME });
  }

  if (rawInputs.length === 0) return 0;

  // 2) Load existing portal connections and build a dedupe set keyed by
  //    the canonical connection string.
  const connStorage = await getConnectionsStorage(PORTAL_SESSION_ID);
  const existing = connStorage.list();
  const seen = new Set<string>(existing.map((c) => c.connection));

  let added = 0;
  for (const raw of rawInputs) {
    const connectionString = normalizeConnectionInput(raw);
    if (seen.has(connectionString)) {
      console.log(`  • already exists, skipped: ${connectionString}`);
      continue;
    }
    const dialect = getDialectTypeFromConnectionString(connectionString) as SqluiCore.Dialect | undefined;
    const entry: Partial<SqluiCore.ConnectionProps> = {
      name: deriveConnectionName(connectionString),
      connection: connectionString,
    };
    if (dialect) entry.dialect = dialect;
    connStorage.add(entry);
    seen.add(connectionString);
    added += 1;
    console.log(`  • added: ${entry.name}  (${connectionString})`);
  }

  return added;
}

// ---------------------------------------------------------------------------
// Session-bootstrap injection — frontend reads window.__SQLUI_PORTAL_SESSION__
// from the served index.html and seeds localStorage with it on first load.
// ---------------------------------------------------------------------------

/**
 * Injects a tiny inline script into index.html that exposes the portal
 * session ID as a window global. The frontend's `getCurrentSessionId()`
 * picks this up so the user lands directly on the connection list rather
 * than the session-select screen.
 */
function injectSessionBootstrap(html: string): string {
  const tag = `<script>window.__SQLUI_PORTAL_SESSION__=${JSON.stringify(PORTAL_SESSION_ID)};</script>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${tag}</head>`);
  }
  return tag + html;
}

// ---------------------------------------------------------------------------
// Browser auto-open
// ---------------------------------------------------------------------------

/** Opens the given URL in the system default browser (best-effort, fire-and-forget). */
function openInBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch (err) {
    console.error("portal.ts:openInBrowser", err);
  }
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

/**
 * Gracefully shuts down the HTTP server then exits.
 */
function gracefulShutdown(server: net.Server, signal: string): void {
  console.log(`\nReceived ${signal}, shutting down portal...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`sqlui-portal — storage: ${process.env.SQLUI_HOME_DIR}`);

  initializeEndpoints();
  mountStaticAssets(resolveAssetsDir(), injectSessionBootstrap);

  let added = 0;
  try {
    added = await bootstrapConnections(opts.inputs);
  } catch (err) {
    console.error("portal.ts:bootstrapConnections", err);
    // Don't fail boot — the user can still add connections via the UI.
  }

  /**
   * Prints the running URL and connection summary.
   * Always called once the server is bound — every page load knows
   * exactly which port it's on (per the user requirement).
   */
  const announce = (actualPort: number, fallback: boolean) => {
    const url = `http://${opts.host}:${actualPort}`;
    console.log("");
    console.log(`▶ sqlui-portal running at ${url}`);
    if (fallback) {
      console.log(`  (port ${opts.port} was in use — fell back to random port ${actualPort})`);
    }
    if (opts.inputs.length > 0) {
      console.log(`  ${added} new connection(s) added, ${opts.inputs.length - added} duplicate(s) skipped`);
    }
    console.log(`  pid ${process.pid} — Ctrl+C to stop`);
    console.log("");
    if (opts.open) openInBrowser(url);
  };

  /**
   * Starts the server on the requested port. If the requested port is busy,
   * automatically retries on port 0 (OS-assigned random) so the user always
   * gets a working URL — and we print which port we ended up on.
   */
  const tryListen = (requestedPort: number, isFallback: boolean) => {
    const server = app.listen(requestedPort, opts.host, () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : requestedPort;
      announce(actualPort, isFallback);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && !isFallback && requestedPort !== 0) {
        console.log(`Port ${requestedPort} is in use — retrying on a random port...`);
        tryListen(0, true);
        return;
      }
      console.error("portal.ts:server error", err);
      process.exit(1);
    });

    process.on("SIGTERM", () => gracefulShutdown(server, "SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown(server, "SIGINT"));
  };

  tryListen(opts.port, false);
})().catch((err) => {
  console.error("portal.ts:main", err);
  process.exit(1);
});
