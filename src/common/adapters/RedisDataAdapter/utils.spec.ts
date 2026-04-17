import { describe, expect, it } from "vitest";
import { getClientOptions } from "src/common/adapters/RedisDataAdapter/utils";

describe("RedisDataAdapter/utils", () => {
  describe("getClientOptions", () => {
    it("parses basic redis connection", () => {
      const result = getClientOptions("redis://127.0.0.1:6379");
      expect(result.url).toBe("redis://127.0.0.1:6379");
    });

    it("includes password when present", () => {
      const result = getClientOptions("redis://default:mypassword@127.0.0.1:6379");
      expect(result.url).toContain("127.0.0.1:6379");
      expect(result.password).toBe("mypassword");
    });

    it("does not include password when absent", () => {
      const result = getClientOptions("redis://127.0.0.1:6379");
      expect(result.password).toBeUndefined();
    });

    it("defaults port to 6379 when not specified", () => {
      const result = getClientOptions("redis://localhost");
      expect(result.url).toContain("6379");
    });

    it("handles rediss scheme for SSL", () => {
      const result = getClientOptions("rediss://127.0.0.1:6380");
      expect(result.url).toBe("rediss://127.0.0.1:6380");
    });

    it("handles Azure Redis connection with username placeholder", () => {
      const result = getClientOptions("rediss://azure:myaccesskey@myredis.redis.cache.windows.net:6380");
      expect(result.url).toContain("myredis.redis.cache.windows.net:6380");
      expect(result.password).toBe("myaccesskey");
    });
  });
});
