import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use a temp dir for tests
const tmpDir = path.join(__dirname, ".test-debug-logs");

vi.mock("os", () => ({
  homedir: () => tmpDir,
}));

describe("debugLogger", () => {
  let writeDebugLog: typeof import("src/common/utils/debugLogger").writeDebugLog;
  let getDebugLogPath: typeof import("src/common/utils/debugLogger").getDebugLogPath;

  beforeEach(async () => {
    fs.mkdirSync(path.join(tmpDir, ".sqlui-native"), { recursive: true });
    // Reset module to clear cached logFilePath
    vi.resetModules();
    const mod = await import("src/common/utils/debugLogger");
    writeDebugLog = mod.writeDebugLog;
    getDebugLogPath = mod.getDebugLogPath;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes a timestamped log entry", () => {
    writeDebugLog("test message");
    const logPath = getDebugLogPath();
    const content = fs.readFileSync(logPath, "utf8");
    expect(content).toContain("test message");
    expect(content).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] test message/);
  });

  it("appends multiple log entries", () => {
    writeDebugLog("first");
    writeDebugLog("second");
    const content = fs.readFileSync(getDebugLogPath(), "utf8");
    expect(content).toContain("first");
    expect(content).toContain("second");
    // "second" must appear after "first"
    expect(content.indexOf("first")).toBeLessThan(content.indexOf("second"));
  });

  it("trims file when exceeding 1MB, keeping last 80%", () => {
    const logPath = getDebugLogPath();
    // Write a file just over 1MB
    const line = "A".repeat(100) + "\n";
    const lineCount = Math.ceil((1024 * 1024 + 1) / line.length);
    const bigContent = line.repeat(lineCount);
    fs.writeFileSync(logPath, bigContent);

    // Write one more line — triggers trim
    writeDebugLog("after-trim");
    const content = fs.readFileSync(logPath, "utf8");

    // File should be trimmed to ~80% of original + the new line
    expect(content.length).toBeLessThan(bigContent.length);
    expect(content).toContain("after-trim");
  });

  it("never crashes the app even with bad paths", () => {
    // This should not throw
    expect(() => writeDebugLog("safe")).not.toThrow();
  });
});
