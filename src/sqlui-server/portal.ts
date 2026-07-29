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
import type { Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { serve } from "@hono/node-server";
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

/**
 * Bag-of-token regex matching every help-trigger we accept.
 *
 * Covered tokens (case-insensitive):
 *   - bare word                : `help`
 *   - GNU long  / short / alt  : `--help`, `-h`, `-?`
 *   - single-dash multi-char   : `-help`            (Java / older C tools)
 *   - bare question mark       : `?`                (DOS-era, some CLIs)
 *   - Windows slash-prefix     : `/?`, `/help`
 *
 * `i` flag → also matches `-H`, `--HELP`, `Help`, etc.
 */
const HELP_TOKEN_RE = /^(help|--help|-help|-h|-\?|\?|\/\?|\/help)$/i;

/**
 * Bag-of-token regex matching every version-trigger we accept (case-insensitive).
 * Covers: `version`, `--version`, `-version`, `-v`, `-V`, `/version`.
 */
const VERSION_TOKEN_RE = /^(version|--version|-version|-v|\/version)$/i;

/** Parsed CLI options for portal mode. */
type PortalOptions = {
  port: number;
  host: string;
  open: boolean;
  inputs: string[];
  help: boolean;
  /** When true, print version string and exit. */
  version: boolean;
  /**
   * Optional storage directory override (CLI flag `--home-dir` / `--config-path`).
   * Wins over `SQLUI_HOME_DIR`, the `--use-desktop-storage` shortcut, and the default.
   */
  homeDir?: string;
  /**
   * When true, the portal uses the desktop app's storage dir (`~/.sqlui-native/`)
   * instead of its own `~/.sqlui-portal/`. Connections show up in the desktop app
   * as a "Portal" session. Equivalent to `--home-dir ~/.sqlui-native`. Lower
   * precedence than an explicit `--home-dir` flag.
   */
  useDesktopStorage?: boolean;
};

/**
 * Compile-time global injected by Vite's `define` in the portal build config.
 * In dev (unbundled), `typeof` is "undefined" — falls back to runtime require
 * on the source-tree package.json so the helper stays runnable in dev too.
 */
declare const __APP_VERSION__: string;

/** Returns the app version string, or "" if it can't be resolved. */
function getAppVersion(): string {
  if (typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__) return __APP_VERSION__;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("src/package.json").version || "";
  } catch {
    return "";
  }
}

/**
 * Parses argv into PortalOptions.
 *
 * Recognized flags:
 *   --port <n> / -p <n>          listen port (default 19378; falls back to random if busy)
 *   --host <h>                   bind host (default 0.0.0.0 — exposed on LAN; use 127.0.0.1 for loopback only)
 *   --home-dir / --config-path   override storage dir (highest priority)
 *   --use-desktop-storage        share storage with the desktop app (~/.sqlui-native)
 *   --no-open                    don't auto-open the browser
 *   --help / -h / -? / /?        print usage
 * Everything else is treated as a positional connection input.
 */
function parseArgs(argv: string[]): PortalOptions {
  const opts: PortalOptions = {
    port: DEFAULT_PORTAL_PORT,
    // Default to 0.0.0.0 so the portal is reachable on the LAN out of the box —
    // the primary use case is sharing a running portal with teammates / other devices.
    // Use `--host 127.0.0.1` to restrict to loopback.
    host: "0.0.0.0",
    open: true,
    inputs: [],
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (HELP_TOKEN_RE.test(arg)) {
      opts.help = true;
    } else if (VERSION_TOKEN_RE.test(arg)) {
      opts.version = true;
    } else if (arg === "--port" || arg === "-p") {
      const n = parseInt(argv[++i] ?? "", 10);
      if (Number.isFinite(n) && n >= 0) opts.port = n;
    } else if (arg === "--host") {
      const h = argv[++i];
      if (h) opts.host = h;
    } else if (arg === "--home-dir" || arg === "--config-path") {
      const d = argv[++i];
      if (d) opts.homeDir = d;
    } else if (arg === "--use-desktop-storage") {
      opts.useDesktopStorage = true;
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

/** Prints CLI usage to stdout. Triggered by `help`, `--help`, `-h`, `-?`, or `/?`. */
function printHelp(): void {
  const version = getAppVersion();
  const v = version ? ` v${version}` : "";

  console.log(
    [
      `sqlui-portal${v} — open any SQL/NoSQL connection in your browser`,
      `(phpMyAdmin / sqlite-web style; every dialect the desktop app supports)`,
      "",
      "USAGE",
      "  sqlui-portal [options] [connection...]",
      "",
      "OPTIONS",
      `  -p, --port <n>             Listen port. Default ${DEFAULT_PORTAL_PORT}. Falls back to a`,
      `                             random free port if the requested one is busy.`,
      `                             Use 0 for OS-assigned random.`,
      "",
      "      --host <host>          Bind host. Default 0.0.0.0 (exposed on the LAN —",
      "                             the banner prints the LAN URL too). Use 127.0.0.1",
      "                             to restrict to loopback only.",
      "",
      "      --home-dir <path>      Storage directory override. Highest priority.",
      "                             Default ~/.sqlui-portal (isolated from the",
      "                             desktop app's ~/.sqlui-native).",
      "      --config-path <path>   Alias for --home-dir.",
      "",
      "      --use-desktop-storage  Share storage with the desktop app",
      "                             (writes to ~/.sqlui-native). Connections show",
      "                             up in the desktop app under a 'Portal' session.",
      "                             Equivalent to: --home-dir ~/.sqlui-native",
      "",
      "      --no-open              Don't auto-open the browser on start.",
      "      --open                 Auto-open the browser (default).",
      "",
      "  Help        help | --help | -help | -h | -? | ? | /? | /help",
      "              (case-insensitive)",
      "  Version     version | --version | -version | -v | /version",
      "              (case-insensitive)",
      "",
      "CONNECTION INPUTS",
      "  Pass zero or more positional connection strings. Each is normalized,",
      "  deduped against existing connections (idempotent — running twice with",
      "  the same input is a no-op), and added to the Portal session.",
      "",
      "  • Bare path             ./mydata.sqlite",
      "                          /var/data/db.sqlite3",
      "                            (auto-resolved to sqlite:///<absolute-path>)",
      "  • SQLite URL            sqlite:///absolute/path/to/db.sqlite",
      "  • PostgreSQL            postgres://user:pass@host:5432/db",
      "  • MySQL / MariaDB       mysql://user:pass@host:3306/db",
      "                          mariadb://user:pass@host:3306/db",
      "  • MS SQL Server         mssql://user:pass@host:1433",
      "  • MongoDB               mongodb://user:pass@host:27017",
      "  • Redis                 redis://host:6379",
      "  • Cassandra             cassandra://user:pass@host:9042",
      "  • Azure Table Storage   aztable://DefaultEndpointsProtocol=...",
      "  • Azure CosmosDB        cosmosdb://AccountEndpoint=...;AccountKey=...",
      '  • Salesforce            sfdc://{"username":"...","password":"..."}',
      "  • REST / GraphQL        rest://https://api.example.com",
      "                          graphql://https://api.example.com/graphql",
      "",
      "ENVIRONMENT VARIABLES",
      "  SQLUI_HOME_DIR             Storage directory. Lower priority than",
      "                             --home-dir / --use-desktop-storage; higher",
      "                             than the default.",
      "  NODE                       Override the Node binary the bash launcher uses.",
      "",
      "EXAMPLES",
      "  # Open a SQLite file (auto-opens browser at http://127.0.0.1:19378):",
      "  sqlui-portal ./mydata.sqlite",
      "",
      "  # Multiple connections, mixed dialects, in one shot:",
      "  sqlui-portal ./local.sqlite \\",
      "    postgres://u:p@db.example.com:5432/mydb \\",
      "    mongodb://localhost:27017",
      "",
      "  # Pick a port + expose on the LAN (great for sharing on a dev box):",
      "  sqlui-portal --port 8080 --host 0.0.0.0 ./shared.sqlite",
      "",
      "  # Throwaway session — fresh isolated dir every run, never persists:",
      '  sqlui-portal --home-dir "$(mktemp -d)" ./mydata.sqlite',
      "",
      "  # Share with the desktop app — connections appear in your .app:",
      "  sqlui-portal --use-desktop-storage ./mydata.sqlite",
      "",
      "  # Headless server: don't auto-open the browser:",
      "  sqlui-portal --no-open --port 19378 ./mydata.sqlite",
      "",
      "STORAGE & SESSIONS",
      "  Default storage dir is ~/.sqlui-portal — fully isolated from the",
      "  desktop app's ~/.sqlui-native. Override with --home-dir or share with",
      "  the desktop via --use-desktop-storage.",
      "",
      "  Every portal-added connection lives under a fixed 'Portal' session.",
      "  Re-running with the same input is a no-op (deduped by canonical",
      "  connection string).",
      "",
      "DOCS",
      "  Project        https://github.com/synle/sqlui-native",
      "  Releases       https://github.com/synle/sqlui-native/releases",
      "  Issues         https://github.com/synle/sqlui-native/issues",
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
    const dialect = getDialectTypeFromConnectionString(connectionString) as
      | SqluiCore.Dialect
      | undefined;
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
function gracefulShutdown(server: Server, signal: string): void {
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
  if (opts.version) {
    console.log(getAppVersion() || "unknown");
    process.exit(0);
  }

  // Storage-dir resolution priority (highest first):
  //   1. --home-dir / --config-path  (explicit override)
  //   2. --use-desktop-storage       (sugar for ~/.sqlui-native)
  //   3. existing process.env.SQLUI_HOME_DIR  (already set by bash launcher or caller)
  //   4. portal.ts top-level default ~/.sqlui-portal (already set above)
  //
  // Setting SQLUI_HOME_DIR here is safe because getStorageDir() is lazy — it
  // reads the env on its FIRST call, which happens inside initializeEndpoints()
  // below. Anything that reads the storage dir before this point would be a bug.
  if (opts.homeDir) {
    process.env.SQLUI_HOME_DIR = path.resolve(opts.homeDir);
  } else if (opts.useDesktopStorage) {
    process.env.SQLUI_HOME_DIR = path.join(os.homedir(), ".sqlui-native");
  }

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
   * Prints a boxed config banner once the server is bound. Every page load knows
   * exactly which port + storage dir it's on, plus the LAN URL when bound to 0.0.0.0.
   */
  const announce = (actualPort: number, fallback: boolean) => {
    // When bound to 0.0.0.0 the bind address itself isn't a friendly URL to
    // click on (browsers tolerate it but it's ugly); show the loopback URL as
    // the primary "URL" and the discovered LAN IP as a second "LAN" line.
    const isWildcard = opts.host === "0.0.0.0";
    const url = isWildcard ? `http://127.0.0.1:${actualPort}` : `http://${opts.host}:${actualPort}`;
    const lanUrl = isWildcard ? `http://${getLanIp()}:${actualPort}` : null;
    const lines = [
      ["URL", url],
      ...(lanUrl ? [["LAN", lanUrl] as [string, string]] : []),
      ["Host", opts.host],
      ["Port", String(actualPort) + (fallback ? `  (requested ${opts.port}, fell back)` : "")],
      ["Storage", process.env.SQLUI_HOME_DIR || "(default)"],
      ["PID", String(process.pid)],
    ];
    if (opts.inputs.length > 0) {
      lines.push([
        "Connections",
        `${added} added, ${opts.inputs.length - added} duplicate skipped`,
      ]);
    }
    const labelWidth = Math.max(...lines.map(([k]) => k.length));
    const body = lines.map(([k, v]) => `  ${k.padEnd(labelWidth)}  ${v}`);
    const width = Math.max(...body.map((s) => s.length), 50);
    const bar = "═".repeat(width);
    const version = getAppVersion();
    const titleLine = version ? `  sqlui-portal v${version}` : `  sqlui-portal`;
    console.log("");
    console.log(`╔${bar}╗`);
    console.log(`║${titleLine.padEnd(width)}║`);
    console.log(`╠${bar}╣`);
    for (const line of body) console.log(`║${line.padEnd(width)}║`);
    console.log(`╚${bar}╝`);
    console.log(`  Ctrl+C to stop`);
    console.log("");
    if (opts.open) openInBrowser(url);
  };

  /**
   * Best-effort LAN IPv4 address for the banner when the user bound to 0.0.0.0.
   * Returns "0.0.0.0" if no non-loopback interface is found.
   */
  function getLanIp(): string {
    try {
      const ifaces = require("node:os").networkInterfaces();
      for (const list of Object.values(ifaces) as any[]) {
        for (const i of list || []) {
          if (i.family === "IPv4" && !i.internal) return i.address;
        }
      }
    } catch {
      /* ignore */
    }
    return "0.0.0.0";
  }

  /**
   * Starts the server on the requested port. If the requested port is busy,
   * automatically retries on port 0 (OS-assigned random) so the user always
   * gets a working URL — and we print which port we ended up on.
   */
  const tryListen = (requestedPort: number, isFallback: boolean) => {
    const server = serve({ fetch: app.fetch, port: requestedPort, hostname: opts.host }, (info) => {
      announce(info.port, isFallback);
    }) as Server;

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
