/** File-based debug logger for diagnosing crashes in packaged builds. */

import fs from "node:fs";
import path from "node:path";

/** Maximum log file size in bytes (1 MB). */
const MAX_DEBUG_LOG_SIZE = 1024 * 1024;

/** Percentage of the log file to keep when trimming (80%). */
const KEEP_PERCENT = 80;

/** Resolved path to the debug log file; set lazily on first write. */
let logFilePath: string | undefined;

/**
 * Resolves and returns the debug log file path.
 * Uses the same storageDir as PersistentStorage (app data directory).
 * Deferred to avoid circular import with PersistentStorageJsonFile.
 * @returns Absolute path to the debug.log file.
 */
function getLogFilePath(): string {
  if (logFilePath) return logFilePath;

  // Replicate the storageDir resolution from PersistentStorageJsonFile
  // to avoid importing it (which would create a circular dependency).
  const homedir = require("os").homedir();
  const baseDir = path.join(homedir, ".sqlui-native");

  fs.mkdirSync(baseDir, { recursive: true });
  logFilePath = path.join(baseDir, "debug.log");
  return logFilePath;
}

/**
 * Formats the current local time as a timestamp string.
 * @returns Timestamp in `YYYY-MM-DD HH:MM:SS.mmm` format.
 */
function formatTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`;
}

/**
 * Trims the log file when it exceeds MAX_DEBUG_LOG_SIZE.
 * Keeps the last 80% of the content, trimming at the nearest line boundary
 * to avoid splitting log lines.
 * @param filePath - Absolute path to the log file.
 */
function trimLogFileIfNeeded(filePath: string): void {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size <= MAX_DEBUG_LOG_SIZE) return;

    const content = fs.readFileSync(filePath, "utf8");
    const keep = Math.floor((content.length * KEEP_PERCENT) / 100);
    const trimAt = content.length - keep;

    // Find the next newline after the trim point to avoid splitting a line
    const newlineIdx = content.indexOf("\n", trimAt);
    const start = newlineIdx !== -1 ? newlineIdx + 1 : trimAt;

    fs.writeFileSync(filePath, content.slice(start));
  } catch (_err) {
    // If we can't trim, just continue — logging should never crash the app
  }
}

/**
 * Writes a timestamped debug log entry to the debug.log file.
 * Automatically trims the file when it exceeds 1 MB, keeping the last 80%.
 * All I/O errors are silently swallowed — logging must never crash the app.
 *
 * @param message - The log message to write.
 *
 * @example
 * ```ts
 * writeDebugLog("app:ready - window created");
 * writeDebugLog(`Endpoints.ts:authenticate error - ${err.message}`);
 * ```
 */
export function writeDebugLog(message: string): void {
  try {
    const filePath = getLogFilePath();

    trimLogFileIfNeeded(filePath);

    const timestamp = formatTimestamp();
    const line = `[${timestamp}] ${message}\n`;

    fs.appendFileSync(filePath, line);
  } catch (_err) {
    // Logging must never crash the app
  }
}

/**
 * Returns the absolute path to the debug log file.
 * Useful for exposing the log location to users or opening it externally.
 * @returns The debug.log file path.
 */
export function getDebugLogPath(): string {
  return getLogFilePath();
}
