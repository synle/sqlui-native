import { vi, describe, test, expect, beforeEach } from "vitest";

vi.mock("tedious", () => {
  // local re-import to avoid hoisting issues
  const EE = require("node:events").EventEmitter;
  class FakeRequest {
    sql: string;
    cb: any;
    constructor(sql: string, cb: any) {
      this.sql = sql;
      this.cb = cb;
    }
  }
  class FakeConnection extends EE {
    connect() {
      setImmediate(() => this.emit("connect"));
    }
    execSql(req: any) {
      // Default: empty result; tests override by replacing prototype.execSql.
      req.cb(null, 0, []);
    }
    close() {
      setImmediate(() => this.emit("end"));
    }
  }
  return { Connection: FakeConnection, Request: FakeRequest };
});

import MSSQLDataAdapter from "src/common/adapters/RelationalDataAdapter/mssql/index";

describe("MSSQLDataAdapter", () => {
  // Save the default execSql so we can restore between tests
  let restoreExecSql: (() => void) | null = null;

  beforeEach(async () => {
    if (restoreExecSql) {
      restoreExecSql();
      restoreExecSql = null;
    }
  });

  test("constructor rewrites sslmode=require → sslmode=no-verify", () => {
    const a: any = new MSSQLDataAdapter("mssql://sa:pw@host:1433/db?sslmode=require");
    expect(a.connectionOption).toContain("sslmode=no-verify");
    expect(a.connectionOption).not.toContain("sslmode=require");
  });

  test("authenticate succeeds (connection emits connect)", async () => {
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    await expect(a.authenticate()).resolves.toBeUndefined();
  });

  test("authenticate rejects when connection emits connect with error", async () => {
    // Override the fake Connection just for this test by spying through requests-array trick.
    // Instead, simulate by patching the request handler — but the connect failure is in the ctor.
    // Easier: hook the prototype via a one-off subclass.
    const { Connection } = await import("tedious");
    const origConnect = (Connection as any).prototype.connect;
    (Connection as any).prototype.connect = function () {
      setImmediate(() => this.emit("connect", new Error("login failed")));
    };
    try {
      const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
      await expect(a.authenticate()).rejects.toThrow(/login failed/);
    } finally {
      (Connection as any).prototype.connect = origConnect;
    }
  });

  test("getDatabases filters system DBs and sorts alphabetically", async () => {
    const { Connection } = await import("tedious");
    (Connection as any).prototype.execSql = function (req: any) {
      const rows = ["master", "tempdb", "model", "msdb", "ZZZ_app", "AAA_app"].map((db) => [
        { metadata: { colName: "database" }, value: db },
      ]);
      req.cb(null, rows.length, rows);
    };
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    const dbs = await a.getDatabases();
    expect(dbs.map((d) => d.name)).toEqual(["AAA_app", "ZZZ_app"]);
  });

  test("getTables returns user tables", async () => {
    const { Connection } = await import("tedious");
    (Connection as any).prototype.execSql = function (req: any) {
      const rows = [
        [{ metadata: { colName: "tablename" }, value: "Users" }],
        [{ metadata: { colName: "tablename" }, value: "Orders" }],
      ];
      req.cb(null, 2, rows);
    };
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    const t = await a.getTables();
    expect(t.map((x) => x.name)).toEqual(["Orders", "Users"]); // sorted
  });

  test("execute returns rows on success", async () => {
    const { Connection } = await import("tedious");
    (Connection as any).prototype.execSql = function (req: any) {
      const rows = [
        [
          { metadata: { colName: "id" }, value: 1 },
          { metadata: { colName: "name" }, value: "Acme" },
        ],
      ];
      req.cb(null, 1, rows);
    };
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    const r = await a.execute("SELECT id, name FROM Users");
    expect(r.ok).toBe(true);
    expect(r.raw).toEqual([{ id: 1, name: "Acme" }]);
    expect(r.affectedRows).toBe(1);
  });

  test("execute returns ok with no raw when no rows", async () => {
    const { Connection } = await import("tedious");
    (Connection as any).prototype.execSql = function (req: any) {
      req.cb(null, 0, []);
    };
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    const r = await a.execute("UPDATE Users SET x = 1");
    expect(r.ok).toBe(true);
    expect(r.raw).toBeUndefined();
  });

  test("execute returns ok:false when request errors", async () => {
    const { Connection } = await import("tedious");
    (Connection as any).prototype.execSql = function (req: any) {
      req.cb(new Error("syntax error"));
    };
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    const r = await a.execute("BAD SQL");
    expect(r.ok).toBe(false);
    expect(String((r as any).error?.message || r.error)).toMatch(/syntax error/);
  });

  test("disconnect resolves when no connection has been opened", async () => {
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    await expect(a.disconnect()).resolves.toBeUndefined();
  });

  test("disconnect resolves after authenticate", async () => {
    const a = new MSSQLDataAdapter("mssql://sa:pw@host:1433");
    await a.authenticate();
    await expect(a.disconnect()).resolves.toBeUndefined();
  });
});
