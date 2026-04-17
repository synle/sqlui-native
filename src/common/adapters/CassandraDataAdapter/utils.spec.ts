import { describe, expect, it } from "vitest";
import { getClientOptions } from "src/common/adapters/CassandraDataAdapter/utils";

describe("CassandraDataAdapter/utils", () => {
  describe("getClientOptions", () => {
    it("parses basic connection string", () => {
      const result = getClientOptions("cassandra://localhost:9042");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(9042);
      expect(result.contactPoints).toEqual(["localhost:9042"]);
    });

    it("parses connection with auth credentials", () => {
      const result = getClientOptions("cassandra://cassandra:cassandra@127.0.0.1:9042");
      expect(result.host).toBe("127.0.0.1");
      expect(result.port).toBe(9042);
      expect(result.authProvider).toEqual({
        username: "cassandra",
        password: "cassandra",
      });
    });

    it("sets keyspace when database is provided", () => {
      const result = getClientOptions("cassandra://localhost:9042", "my_keyspace");
      expect(result.keyspace).toBe("my_keyspace");
    });

    it("does not set keyspace when database is omitted", () => {
      const result = getClientOptions("cassandra://localhost:9042");
      expect(result.keyspace).toBeUndefined();
    });

    it("does not set authProvider when no credentials", () => {
      const result = getClientOptions("cassandra://localhost:9042");
      expect(result.authProvider).toBeUndefined();
    });

    it("defaults port to 9042 when not specified", () => {
      const result = getClientOptions("cassandra://localhost");
      expect(result.port).toBe(9042);
    });

    it("throws on connection string without host", () => {
      expect(() => getClientOptions("cassandra://")).toThrow("Invalid connection");
    });
  });
});
