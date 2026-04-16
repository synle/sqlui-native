/**
 * Bootstrap entry point for the Electron main process.
 * This file is intentionally NOT bundled by Vite — it uses only Node.js built-ins
 * so it always loads, even when the app bundle (app.js) fails due to native module
 * crashes or other import-time errors.
 *
 * Writes an early debug log and sets up crash handlers before loading the app.
 */
"use strict";

const fs = require("fs");
const nodePath = require("path");

// Resolve the debug log path using only Node built-ins
function getLogPath() {
  let baseDir;
  try {
    const { app } = require("electron");
    baseDir = nodePath.join(app.getPath("appData"), "sqlui-native");
  } catch (_err) {
    baseDir = nodePath.join(require("os").homedir(), ".sqlui-native");
  }
  fs.mkdirSync(baseDir, { recursive: true });
  return nodePath.join(baseDir, "debug.log");
}

// Write a timestamped line to the debug log (sync, never throws)
function earlyLog(message) {
  try {
    const logPath = getLogPath();
    const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
    fs.appendFileSync(logPath, "[" + ts + "] " + message + "\n");
  } catch (_err) {
    // logging must never crash the app
  }
}

earlyLog(
  "bootstrap:start - platform=" +
    process.platform +
    " arch=" +
    process.arch +
    " node=" +
    process.versions.node +
    " electron=" +
    (process.versions.electron || "N/A") +
    " pid=" +
    process.pid,
);

// Catch crashes that happen during app module loading
process.on("uncaughtException", function (err) {
  earlyLog("bootstrap:uncaughtException - " + ((err && err.message) || err) + "\n" + ((err && err.stack) || ""));
  console.error("Uncaught Exception:", (err && err.message) || err);
});

process.on("unhandledRejection", function (reason) {
  earlyLog("bootstrap:unhandledRejection - " + reason);
  console.error("Unhandled Rejection:", reason);
});

// Load the actual app bundle
try {
  earlyLog("bootstrap:loading - importing app.js");
  require("./app.js");
  earlyLog("bootstrap:loaded - app.js imported successfully");
} catch (err) {
  earlyLog("bootstrap:FATAL - app failed to load: " + ((err && err.message) || err) + "\n" + ((err && err.stack) || ""));
  console.error("FATAL: App failed to load:", err);

  // Show an error dialog so the user sees something instead of a silent crash
  try {
    var electron = require("electron");
    electron.app.whenReady().then(function () {
      electron.dialog.showErrorBox(
        "sqlui-native failed to start",
        ((err && err.message) || String(err)) + "\n\nCheck debug.log in the app data folder for details.",
      );
      electron.app.quit();
    });
  } catch (_dialogErr) {
    process.exit(1);
  }
}
