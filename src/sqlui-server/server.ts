/** Hono application wiring for the sqlui-server. */
import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { setUpDataEndpoints } from "src/common/Endpoints";

// prevent process crashes from unhandled connection errors (e.g. mariadb timeout)
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", (err as any)?.message || err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

/** Hono application instance for the sqlui-server. */
export const app = new Hono();

// Allow cross-origin requests from the Tauri tauri:// protocol and the localhost dev server.
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

// file upload endpoint used by the server to read uploaded file content
app.post("/api/file", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.text("Cannot read the file", 400);
    }
    const text = await (file as File).text();
    return c.body(text, 200);
  } catch (err) {
    console.error("server.ts:postFile", err);
    return c.text("Cannot read the file", 400);
  }
});

/**
 * Writes a text file to the host filesystem at an absolute path supplied by the caller.
 * Used by the Tauri save-file flow: the renderer picks a path via the native save dialog,
 * then POSTs the text payload here so the sidecar (which has fs access) can persist it.
 * Body: `{ path: string, content: string }`.
 */
app.post("/api/file/save", async (c) => {
  try {
    const body = (await c.req.json()) as { path?: unknown; content?: unknown };
    const filePath = body?.path;
    const content = body?.content;
    if (typeof filePath !== "string" || filePath.length === 0) {
      return c.json({ error: "Missing or invalid 'path'" }, 400);
    }
    if (typeof content !== "string") {
      return c.json({ error: "Missing or invalid 'content'" }, 400);
    }
    if (!path.isAbsolute(filePath)) {
      return c.json({ error: "'path' must be absolute" }, 400);
    }
    fs.writeFileSync(filePath, content, { encoding: "utf-8" });
    return c.json({ path: filePath }, 200);
  } catch (err) {
    console.error("server.ts:postFileSave", err);
    return c.json({ error: "Failed to save the file" }, 500);
  }
});

/**
 * Health check endpoint for verifying the server is running.
 * Returns process ID and uptime for diagnostics.
 */
app.get("/api/health", (c) => {
  return c.json({ status: "ok", pid: process.pid, uptime: process.uptime() }, 200);
});

/**
 * Registers all API endpoints on the Hono app.
 * Called explicitly by the entry point rather than at import time,
 * so callers can import this module without triggering setup in dev mode.
 */
export function initializeEndpoints(): void {
  setUpDataEndpoints(app);
}

/** Default port for the sqlui-server in standalone/dev mode. */
export const port = 3001;

/**
 * Mounts a static-file directory plus a SPA fallback.
 * Used by portal mode and the sidecar to serve the bundled React frontend alongside the API,
 * so a single Node process exposes the full webapp at one URL (phpMyAdmin-style).
 *
 * @param assetsDir - Absolute path to the directory containing index.html and assets/.
 * @param indexHtmlTransformer - Optional callback to mutate the served index.html on the fly
 *   (used by portal mode to inject a default session ID into the page).
 */
export function mountStaticAssets(
  assetsDir: string,
  indexHtmlTransformer?: (html: string) => string,
): void {
  if (!assetsDir || !fs.existsSync(assetsDir)) {
    console.warn(`server.ts:mountStaticAssets - assets dir not found: ${assetsDir}`);
    return;
  }

  const indexHtmlPath = path.join(assetsDir, "index.html");

  // index.html — read on each request so the transformer can inject runtime values.
  // Registered as the SPA fallback last so any actual static asset matches first.
  const sendIndex = (c: any) => {
    try {
      let html = fs.readFileSync(indexHtmlPath, "utf-8");
      if (indexHtmlTransformer) html = indexHtmlTransformer(html);
      c.header("Content-Type", "text/html; charset=utf-8");
      c.header("Cache-Control", "no-cache");
      return c.body(html, 200);
    } catch (err) {
      console.error("server.ts:mountStaticAssets sendIndex", err);
      return c.text("Failed to load index.html", 500);
    }
  };

  // Index requests (`/` or `/index.html`) must always run through the
  // transformer so the portal can inject `window.__SQLUI_PORTAL_SESSION__`.
  // Register these BEFORE serveStatic so they win over the on-disk file.
  app.get("/", (c) => sendIndex(c));
  app.get("/index.html", (c) => sendIndex(c));

  // Hashed assets are immutable — long cache; .html stays no-cache.
  // `serveStatic` resolves files relative to `process.cwd()` from the given
  // `root`. When the file isn't found it calls next() so the SPA fallback can
  // run.
  app.use(
    "/*",
    serveStatic({
      root: path.relative(process.cwd(), assetsDir) || ".",
      onFound: (_path, c) => {
        const ext = path.extname(_path);
        if (ext === ".html") {
          c.header("Cache-Control", "no-cache");
        } else {
          c.header("Cache-Control", "public, max-age=2592000");
        }
      },
    }),
  );

  // SPA fallback: any non-/api GET that didn't match a static asset → index.html.
  // Skip /api/* so 404s from the API still return JSON, not HTML.
  app.get("*", async (c, next) => {
    if (c.req.path.startsWith("/api/")) return next();
    if (c.req.method !== "GET") return next();
    return sendIndex(c);
  });
}
