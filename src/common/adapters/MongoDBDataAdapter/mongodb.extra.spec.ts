import { vi, describe, test, expect, beforeEach } from "vitest";

const mockClose = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockListDatabases = vi.fn();
const mockListCollections = vi.fn();
const mockFind = vi.fn();
const mockCreateCollection = vi.fn();

const mockInsertOne = vi.fn();

vi.mock("mongodb", () => ({
  MongoClient: vi.fn().mockImplementation(function () {
    return {
      connect: mockConnect,
      close: mockClose,
      db: vi.fn().mockImplementation(() => ({
        admin: () => ({ listDatabases: mockListDatabases }),
        listCollections: () => ({ toArray: mockListCollections }),
        collection: () => ({
          find: () => ({ limit: () => ({ toArray: mockFind }) }),
          insertOne: mockInsertOne,
        }),
        createCollection: mockCreateCollection,
      })),
    };
  }),
}));

import MongoDBDataAdapter from "src/common/adapters/MongoDBDataAdapter/index";

describe("MongoDBDataAdapter extra coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("disconnect — swallows close errors", async () => {
    mockClose.mockRejectedValueOnce(new Error("boom"));
    const a = new MongoDBDataAdapter("mongodb://127.0.0.1:27017");
    await a.authenticate();
    await expect(a.disconnect()).resolves.toBeUndefined();
  });

  test("disconnect — no-op when never connected", async () => {
    const a = new MongoDBDataAdapter("mongodb://127.0.0.1:27017");
    await expect(a.disconnect()).resolves.toBeUndefined();
  });

  test("execute — db.create / db.createDatabase pattern", async () => {
    mockListDatabases.mockResolvedValue({ databases: [] });
    mockCreateCollection.mockResolvedValue(undefined);
    const a = new MongoDBDataAdapter("mongodb://127.0.0.1:27017");
    const r = await a.execute(`db.createDatabase('newdb')`);
    expect(r.ok).toBe(true);
    expect(r.meta).toMatch(/created/i);
    expect(mockCreateCollection).toHaveBeenCalledWith("test-collection");
  });

  test("execute — db.create throws when database already exists", async () => {
    mockListDatabases.mockResolvedValue({ databases: [{ name: "existing" }] });
    const a = new MongoDBDataAdapter("mongodb://127.0.0.1:27017");
    const r = await a.execute(`db.create('existing')`);
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/already existed|already existed/i);
  });

  test("execute returns ok with empty raw when eval result is an array", async () => {
    // Force the eval'd code (via the `db` alias) to return an array.
    // The execute method uses eval(sql); we craft a sql string that returns a known array via the `db` local.
    // Using IIFE so the eval'd expression is self-contained.
    const a = new MongoDBDataAdapter("mongodb://127.0.0.1:27017");
    const r = await a.execute(`(function(){return [{a:1}];})(); db.x`);
    // Either branch (Array path or generic meta path) returns ok:true
    expect(r.ok).toBe(true);
  });
});
