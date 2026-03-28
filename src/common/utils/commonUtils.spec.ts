import { getGeneratedRandomId } from "src/common/utils/commonUtils";

describe("commonUtils", () => {
  describe("getGeneratedRandomId", () => {
    test("returns a string with the given prefix", () => {
      const id = getGeneratedRandomId("connection");
      expect(id.startsWith("connection.")).toBe(true);
    });

    test("contains three dot-separated parts", () => {
      const id = getGeneratedRandomId("query");
      const parts = id.split(".");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("query");
    });

    test("second part is a timestamp-like number", () => {
      const before = Date.now();
      const id = getGeneratedRandomId("item");
      const after = Date.now();
      const timestamp = parseInt(id.split(".")[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test("third part is a numeric random value", () => {
      const id = getGeneratedRandomId("test");
      const randomPart = id.split(".")[2];
      expect(Number.isFinite(parseInt(randomPart, 10))).toBe(true);
    });

    test("generates unique IDs on consecutive calls", () => {
      const ids = new Set(Array.from({ length: 50 }, () => getGeneratedRandomId("u")));
      expect(ids.size).toBe(50);
    });

    test("works with empty prefix", () => {
      const id = getGeneratedRandomId("");
      expect(id.startsWith(".")).toBe(true);
      expect(id.split(".").length).toBe(3);
    });
  });
});
