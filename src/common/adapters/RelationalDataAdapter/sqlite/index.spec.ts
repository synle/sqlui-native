/**
 * Tests for SQLiteDataAdapter file validation.
 * Covers the four file-state branches: missing, empty, invalid, ok.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import SQLiteDataAdapter from "src/common/adapters/RelationalDataAdapter/sqlite";

/** Tracks files/dirs created per test for cleanup. */
let cleanupPaths: string[] = [];

/**
 * Allocates a unique temp directory under the OS tmpdir.
 * Tracked for afterEach cleanup.
 */
function mkTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sqlui-sqlite-test-"));
  cleanupPaths.push(dir);
  return dir;
}

/**
 * Writes the standard SQLite header magic followed by some junk so the file
 * looks like a real DB to the magic-byte check (but isn't a full DB).
 * Useful to verify the magic check passes; full validity is left to node:sqlite.
 */
function writeSqliteMagicFile(filepath: string): void {
  // Real, minimal SQLite database created by running `sqlite3 <f> "VACUUM;"`.
  // We just write the header here — node:sqlite will reject reads on a
  // truncated file, which is fine for the "magic passes but DB is malformed"
  // path that callers may want.
  const buf = Buffer.alloc(100);
  buf.write("SQLite format 3\0", 0, "binary");
  fs.writeFileSync(filepath, buf);
}

describe("SQLiteDataAdapter file validation", () => {
  beforeEach(() => {
    cleanupPaths = [];
  });

  afterEach(() => {
    for (const p of cleanupPaths) {
      try {
        fs.rmSync(p, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    }
  });

  test("missing file → authenticate throws 'SQLite file not found'", async () => {
    const dir = mkTmpDir();
    const missingPath = path.join(dir, "does-not-exist.db");
    const adapter = new SQLiteDataAdapter(`sqlite://${missingPath}`);
    await expect(adapter.authenticate()).rejects.toThrow(/SQLite file not found at:/);
  });

  test("empty file → authenticate succeeds, getTables throws 'SQLite file is empty'", async () => {
    const dir = mkTmpDir();
    const emptyPath = path.join(dir, "empty.db");
    fs.writeFileSync(emptyPath, "");
    const adapter = new SQLiteDataAdapter(`sqlite://${emptyPath}`);
    await expect(adapter.authenticate()).resolves.toBeUndefined();
    await expect(adapter.getTables()).rejects.toThrow(/SQLite file is empty/);
    await adapter.disconnect();
  });

  test("non-SQLite file (wrong header) → authenticate throws 'Invalid SQLite file'", async () => {
    const dir = mkTmpDir();
    const badPath = path.join(dir, "not-sqlite.db");
    fs.writeFileSync(badPath, "this is just a text file, not a SQLite database at all");
    const adapter = new SQLiteDataAdapter(`sqlite://${badPath}`);
    await expect(adapter.authenticate()).rejects.toThrow(/Invalid SQLite file/);
  });

  test("tiny non-SQLite file (smaller than header) → 'Invalid SQLite file'", async () => {
    const dir = mkTmpDir();
    const tinyPath = path.join(dir, "tiny.db");
    fs.writeFileSync(tinyPath, "abc");
    const adapter = new SQLiteDataAdapter(`sqlite://${tinyPath}`);
    await expect(adapter.authenticate()).rejects.toThrow(/Invalid SQLite file/);
  });

  test("file with SQLite magic header passes file-validation gate", async () => {
    const dir = mkTmpDir();
    const fakePath = path.join(dir, "magic-only.db");
    writeSqliteMagicFile(fakePath);
    const adapter = new SQLiteDataAdapter(`sqlite://${fakePath}`);
    // resolveStoragePath() / authenticate() must NOT throw for files that pass
    // the magic check. (node:sqlite may still reject the file later when it
    // tries to read pages — that's a different code path and out of scope here.)
    // We exercise authenticate() and accept either resolution; the assertion is
    // that the validation gate didn't trip.
    let validationError: unknown;
    try {
      await adapter.authenticate();
    } catch (err) {
      validationError = err;
    }
    // The pre-flight validator should not reject — any error must come from
    // node:sqlite, not from our classifier.
    if (validationError instanceof Error) {
      expect(validationError.message).not.toMatch(/SQLite file not found/);
      expect(validationError.message).not.toMatch(/Invalid SQLite file/);
      expect(validationError.message).not.toMatch(/SQLite file is empty/);
    }
    await adapter.disconnect();
  });

  test(":memory: connection bypasses file validation", async () => {
    const adapter = new SQLiteDataAdapter("sqlite://:memory:");
    await expect(adapter.authenticate()).resolves.toBeUndefined();
    await expect(adapter.getTables()).resolves.toEqual([]);
    await adapter.disconnect();
  });
});
