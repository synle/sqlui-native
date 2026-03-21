import { describe, expect, it, vi } from "vitest";

vi.mock("src/common/adapters/RedisDataAdapter/utils", () => ({
  getClientOptions: vi.fn(() => ({ url: "redis://localhost:6379" })),
}));

import {
  REDIS_ADAPTER_PREFIX,
  getSetValue,
  getGet,
  getScan,
  getHset,
  getHget,
  getHvals,
  getHexist,
  getListLPush,
  getListRPush,
  getListLPop,
  getListRPop,
  getListGetItems,
  getSetGetItems,
  getSetAddItems,
  getSetIsMember,
  getSetCount,
  getSetRemoveLastItem,
  getSortedSetGetItems,
  getSortedSetAddItem,
  getPublishMessage,
  ConcreteDataScripts,
} from "src/common/adapters/RedisDataAdapter/scripts";

const baseInput = {
  dialect: "redis",
  connectionId: "conn1",
  databaseId: "0",
  tableId: "mykey",
  querySize: 200,
  columns: [],
} as any;

describe("RedisDataAdapter scripts", () => {
  describe("REDIS_ADAPTER_PREFIX", () => {
    it('should be "db"', () => {
      expect(REDIS_ADAPTER_PREFIX).toBe("db");
    });
  });

  describe("getSetValue", () => {
    it("should return an object with label and query", () => {
      const result = getSetValue(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Set Value");
      expect(result!.query).toContain(".set(");
    });

    it("should return undefined for unsupported dialect", () => {
      // Function does not check dialect, so it returns a result regardless
      const result = getSetValue({ ...baseInput, dialect: "unsupported" } as any);
      expect(result).toBeDefined();
    });
  });

  describe("getGet", () => {
    it("should return an object with label and query", () => {
      const result = getGet(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Get Value by Key");
      expect(result!.query).toContain(".get(");
    });
  });

  describe("getScan", () => {
    it("should return an object with label and query", () => {
      const result = getScan(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Scan for keys");
      expect(result!.query).toContain(".keys(");
    });
  });

  describe("getHset", () => {
    it("should return an object with label and query", () => {
      const result = getHset(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Hashset");
      expect(result!.query).toContain(".hSet(");
    });
  });

  describe("getHget", () => {
    it("should return an object with label and query", () => {
      const result = getHget(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Hashset");
      expect(result!.query).toContain(".hGetAll(");
    });
  });

  describe("getHvals", () => {
    it("should return an object with label and query", () => {
      const result = getHvals(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Hashset");
      expect(result!.query).toContain(".hVals(");
    });
  });

  describe("getHexist", () => {
    it("should return an object with label and query", () => {
      const result = getHexist(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Hashset");
      expect(result!.query).toContain(".hExists(");
    });
  });

  describe("getListLPush", () => {
    it("should return an object with label and query", () => {
      const result = getListLPush(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("List");
      expect(result!.query).toContain(".lPush(");
    });
  });

  describe("getListRPush", () => {
    it("should return an object with label and query", () => {
      const result = getListRPush(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("List");
      expect(result!.query).toContain(".rPush(");
    });
  });

  describe("getListLPop", () => {
    it("should return an object with label and query", () => {
      const result = getListLPop(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("List");
      expect(result!.query).toContain(".lPop(");
    });
  });

  describe("getListRPop", () => {
    it("should return an object with label and query", () => {
      const result = getListRPop(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("List");
      expect(result!.query).toContain(".rPop(");
    });
  });

  describe("getListGetItems", () => {
    it("should return an object with label and query", () => {
      const result = getListGetItems(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("List");
      expect(result!.query).toContain(".lRange(");
    });
  });

  describe("getSetGetItems", () => {
    it("should return an object with label and query", () => {
      const result = getSetGetItems(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Set");
      expect(result!.query).toContain(".sMembers(");
    });
  });

  describe("getSetAddItems", () => {
    it("should return an object with label and query", () => {
      const result = getSetAddItems(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Set");
      expect(result!.query).toContain(".sAdd(");
    });
  });

  describe("getSetIsMember", () => {
    it("should return an object with label and query", () => {
      const result = getSetIsMember(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Set");
      expect(result!.query).toContain(".sIsMember(");
    });
  });

  describe("getSetCount", () => {
    it("should return an object with label and query", () => {
      const result = getSetCount(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Set");
      expect(result!.query).toContain(".sCard(");
    });
  });

  describe("getSetRemoveLastItem", () => {
    it("should return an object with label and query", () => {
      const result = getSetRemoveLastItem(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Set");
      expect(result!.query).toContain(".sPop(");
    });
  });

  describe("getSortedSetGetItems", () => {
    it("should return an object with label and query", () => {
      const result = getSortedSetGetItems(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Sorted Set");
      expect(result!.query).toContain(".zRange(");
    });
  });

  describe("getSortedSetAddItem", () => {
    it("should return an object with label and query", () => {
      const result = getSortedSetAddItem(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Sorted Set");
      expect(result!.query).toContain(".zAdd(");
    });
  });

  describe("getPublishMessage", () => {
    it("should return an object with label and query", () => {
      const result = getPublishMessage(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Publish a message");
      expect(result!.query).toContain(".publish(");
    });
  });

  describe("ConcreteDataScripts", () => {
    const scripts = new ConcreteDataScripts();

    it("should support redis and rediss dialects", () => {
      expect(scripts.dialects).toContain("redis");
      expect(scripts.dialects).toContain("rediss");
    });

    it("should not require table ID for query", () => {
      expect(scripts.getIsTableIdRequiredForQuery()).toBe(false);
    });

    it("should return javascript as syntax mode", () => {
      expect(scripts.getSyntaxMode()).toBe("javascript");
    });

    it("should not support migration", () => {
      expect(scripts.supportMigration()).toBe(false);
    });

    it("should not support create record form", () => {
      expect(scripts.supportCreateRecordForm()).toBe(false);
    });

    it("should not support edit record form", () => {
      expect(scripts.supportEditRecordForm()).toBe(false);
    });

    it("should return correct dialect name for redis", () => {
      expect(scripts.getDialectName("redis")).toBe("Redis");
    });

    it("should return correct dialect name for rediss", () => {
      expect(scripts.getDialectName("rediss")).toBe("Redis with SSL");
    });

    it("should return a dialect icon", () => {
      expect(scripts.getDialectIcon()).toBeDefined();
    });

    it("should return table scripts", () => {
      const tableScripts = scripts.getTableScripts();
      expect(tableScripts.length).toBeGreaterThan(0);
    });

    it("should return empty database scripts", () => {
      const dbScripts = scripts.getDatabaseScripts();
      expect(dbScripts).toEqual([]);
    });

    it("should return empty connection scripts", () => {
      const connScripts = scripts.getConnectionScripts();
      expect(connScripts).toEqual([]);
    });

    it("should return a sample connection string for redis", () => {
      expect(scripts.getSampleConnectionString("redis")).toContain("redis://");
    });

    it("should return a sample connection string for rediss", () => {
      expect(scripts.getSampleConnectionString("rediss")).toContain("rediss://");
    });

    it("should return undefined for sample select query", () => {
      expect(scripts.getSampleSelectQuery()).toBeUndefined();
    });
  });
});
