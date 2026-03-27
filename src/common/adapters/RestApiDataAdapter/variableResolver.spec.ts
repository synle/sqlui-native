import { describe, expect, it } from "vitest";
import { extractVariableNames, mergeVariableLayers, resolveVariables } from "src/common/adapters/RestApiDataAdapter/variableResolver";

describe("variableResolver", () => {
  describe("mergeVariableLayers", () => {
    it("merges variables from multiple layers", () => {
      const global = [{ key: "HOST", value: "https://global.com", enabled: true }];
      const collection = [{ key: "HOST", value: "https://collection.com", enabled: true }];
      const result = mergeVariableLayers(global, collection);
      expect(result["HOST"]).toBe("https://collection.com");
    });

    it("skips disabled variables", () => {
      const vars = [{ key: "TOKEN", value: "secret", enabled: false }];
      const result = mergeVariableLayers(vars);
      expect(result["TOKEN"]).toBeUndefined();
    });

    it("handles undefined layers", () => {
      const result = mergeVariableLayers(undefined, [{ key: "A", value: "1", enabled: true }], undefined);
      expect(result["A"]).toBe("1");
    });

    it("later layers override earlier ones", () => {
      const layer1 = [{ key: "X", value: "1", enabled: true }];
      const layer2 = [{ key: "X", value: "2", enabled: true }];
      const layer3 = [{ key: "X", value: "3", enabled: true }];
      expect(mergeVariableLayers(layer1, layer2, layer3)["X"]).toBe("3");
    });
  });

  describe("resolveVariables", () => {
    it("replaces simple variables", () => {
      const result = resolveVariables("{{HOST}}/api", { HOST: "https://example.com" });
      expect(result).toBe("https://example.com/api");
    });

    it("replaces multiple variables", () => {
      const result = resolveVariables("{{HOST}}/{{PATH}}?token={{TOKEN}}", {
        HOST: "https://api.com",
        PATH: "users",
        TOKEN: "abc",
      });
      expect(result).toBe("https://api.com/users?token=abc");
    });

    it("leaves unresolved variables as-is", () => {
      const result = resolveVariables("{{HOST}}/{{UNKNOWN}}", { HOST: "https://api.com" });
      expect(result).toBe("https://api.com/{{UNKNOWN}}");
    });

    it("resolves $timestamp as numeric string", () => {
      const result = resolveVariables("ts={{$timestamp}}", {});
      expect(result).toMatch(/^ts=\d+$/);
    });

    it("resolves $isoTimestamp as ISO string", () => {
      const result = resolveVariables("t={{$isoTimestamp}}", {});
      expect(result).toMatch(/^t=\d{4}-\d{2}-\d{2}T/);
    });

    it("resolves $randomUUID as UUID", () => {
      const result = resolveVariables("id={{$randomUUID}}", {});
      expect(result).toMatch(/^id=[0-9a-f-]{36}$/);
    });

    it("resolves $randomInt as number", () => {
      const result = resolveVariables("n={{$randomInt}}", {});
      expect(result).toMatch(/^n=\d+$/);
    });

    it("handles template with no variables", () => {
      const result = resolveVariables("no variables here", {});
      expect(result).toBe("no variables here");
    });
  });

  describe("extractVariableNames", () => {
    it("extracts variable names", () => {
      const names = extractVariableNames("{{HOST}}/{{PATH}}?t={{TOKEN}}");
      expect(names).toEqual(["HOST", "PATH", "TOKEN"]);
    });

    it("returns empty array for no variables", () => {
      expect(extractVariableNames("no vars")).toEqual([]);
    });

    it("extracts dynamic variable names", () => {
      const names = extractVariableNames("{{$timestamp}} {{$randomUUID}}");
      expect(names).toEqual(["$timestamp", "$randomUUID"]);
    });
  });
});
