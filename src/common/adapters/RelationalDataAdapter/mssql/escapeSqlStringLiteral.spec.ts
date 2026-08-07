import { describe, expect, it } from "vitest";
import { escapeSqlStringLiteral } from "src/common/adapters/RelationalDataAdapter/mssql/index";

describe("escapeSqlStringLiteral", () => {
  it("doubles a single apostrophe so the literal is not terminated early", () => {
    expect(escapeSqlStringLiteral("O'Brien")).toBe("O''Brien");
  });

  it("doubles every apostrophe in an injection attempt", () => {
    expect(escapeSqlStringLiteral("x' OR 1=1 --")).toBe("x'' OR 1=1 --");
  });

  it("leaves ordinary table names untouched", () => {
    expect(escapeSqlStringLiteral("Customers")).toBe("Customers");
  });

  it("handles an empty string", () => {
    expect(escapeSqlStringLiteral("")).toBe("");
  });

  it("coerces null and undefined to an empty string", () => {
    expect(escapeSqlStringLiteral(null as unknown as string)).toBe("");
    expect(escapeSqlStringLiteral(undefined as unknown as string)).toBe("");
  });
});
