import bodyParser from "body-parser";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import { setUpDataEndpoints } from "src/common/Endpoints";

// prevent process crashes from unhandled connection errors (e.g. mariadb timeout)
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.message || err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

/** Express application instance for the sqlui-server. */
export const app = express();

const upload = multer({ dest: path.join(os.tmpdir(), "sqlui-native-upload") });

// Allow cross-origin requests from the Electron file:// protocol and localhost dev server
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(bodyParser.urlencoded({ extended: false, limit: "50mb" })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json({ limit: "50mb" })); // parse application/json

// file upload endpoint used by the server to read uploaded file content
app.post("/api/file", upload.single("file"), async (req, res) => {
  try {
    //@ts-ignore
    res.status(200).send(fs.readFileSync(req.file.path, { encoding: "utf-8" }));
  } catch (err) {
    console.error("server.ts:status", err);
    res.status(400).send("Cannot read the file");
  }
});

/**
 * Registers all API endpoints on the Express app.
 * Called explicitly by the entry point rather than at import time,
 * so Electron can import this module without triggering setup in dev mode.
 */
export function initializeEndpoints(): void {
  setUpDataEndpoints(app);
}

/** Default port for the sqlui-server in standalone/dev mode. */
export const port = 3001;

/**
 * Health check endpoint for verifying the server is running.
 * Returns process ID and uptime for diagnostics.
 */
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", pid: process.pid, uptime: process.uptime() });
});
