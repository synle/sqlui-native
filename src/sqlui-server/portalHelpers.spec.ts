import { describe, test, expect, vi, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { normalizeConnectionInput, deriveConnectionName } from "src/sqlui-server/portalHelpers";

describe("portalHelpers", () => {
  describe("normalizeConnectionInput", () => {
    test("returns dialect:// URLs unchanged", () => {
      expect(normalizeConnectionInput("postgres://user:pass@db:5432/mydb")).toBe(
        "postgres://user:pass@db:5432/mydb",
      );
      expect(normalizeConnectionInput("mongodb://localhost:27017")).toBe(
        "mongodb://localhost:27017",
      );
      expect(normalizeConnectionInput("redis://host:6379")).toBe("redis://host:6379");
      expect(normalizeConnectionInput("mysql://u:p@h:3306/d")).toBe("mysql://u:p@h:3306/d");
      expect(normalizeConnectionInput("sqlite:///abs/path/db.sqlite")).toBe(
        "sqlite:///abs/path/db.sqlite",
      );
    });

    test("returns Microsoft-style aztable strings unchanged", () => {
      const aztable = "aztable://DefaultEndpointsProtocol=https;AccountName=acme;AccountKey=fake==";
      expect(normalizeConnectionInput(aztable)).toBe(aztable);
    });

    test("converts a *.sqlite filename to sqlite:// with the absolute path", () => {
      const out = normalizeConnectionInput("./mydata.sqlite");
      expect(out.startsWith("sqlite://")).toBe(true);
      expect(out).toContain(path.resolve("./mydata.sqlite"));
    });

    test("converts a *.db filename to sqlite:// even when the file does not exist", () => {
      const out = normalizeConnectionInput("./nonexistent-fake.db");
      expect(out.startsWith("sqlite://")).toBe(true);
    });

    test("converts an existing path with no sqlite suffix to sqlite://", () => {
      // existsSync returns true → treat as sqlite
      const spy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
      try {
        const out = normalizeConnectionInput("./some-existing-thing");
        expect(out.startsWith("sqlite://")).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });

    test("returns ambiguous strings as-is when neither URL-shaped nor sqlite-shaped", () => {
      const spy = vi.spyOn(fs, "existsSync").mockReturnValue(false);
      try {
        expect(normalizeConnectionInput("just-some-string")).toBe("just-some-string");
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("deriveConnectionName", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("uses the basename for sqlite:// connection strings", () => {
      expect(deriveConnectionName("sqlite:///var/data/acme.sqlite")).toBe("acme.sqlite");
      expect(deriveConnectionName("sqlite:///var/data/initech.db")).toBe("initech.db");
    });

    test("falls back to 'SQLite' when the sqlite path has no basename", () => {
      expect(deriveConnectionName("sqlite://")).toBe("SQLite");
    });

    test("uses dialect (host:port) for URL-style connection strings", () => {
      expect(deriveConnectionName("postgres://user:pass@db.example.com:5432/mydb")).toBe(
        "postgres (db.example.com:5432)",
      );
      expect(deriveConnectionName("mongodb://localhost:27017")).toBe("mongodb (localhost:27017)");
      expect(deriveConnectionName("redis://localhost:6379")).toBe("redis (localhost:6379)");
    });

    test("derives a name from Microsoft-style aztable strings (URL parser tolerates them)", () => {
      // aztable://DefaultEndpointsProtocol=… is parseable as a URL — host becomes the rest
      const out = deriveConnectionName("aztable://DefaultEndpointsProtocol=https;AccountName=x");
      expect(out.startsWith("aztable")).toBe(true);
    });

    test("returns 'connection' as the ultimate fallback for unparseable input", () => {
      expect(deriveConnectionName("nonsense-no-scheme")).toBe("connection");
    });
  });
});
