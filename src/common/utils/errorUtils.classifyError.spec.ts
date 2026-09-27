import { describe, test, expect } from "vitest";
import { classifyError } from "src/common/utils/errorUtils";

describe("classifyError", () => {
  test.each([
    [{ code: "ECONNREFUSED" }, "network"],
    [{ code: "ENOTFOUND" }, "network"],
    [{ code: "ETIMEDOUT" }, "timeout"],
    [{ code: "ER_ACCESS_DENIED_ERROR" }, "auth"],
    [{ code: "ER_PARSE_ERROR" }, "syntax"],
    [{ code: "28P01" }, "auth"],
    [{ code: "42P01" }, "syntax"],
    [{ code: "42601" }, "syntax"],
    [{ code: "57014" }, "cancelled"],
    [{ code: "ELOGIN" }, "auth"],
    [{ code: "ECANCEL" }, "cancelled"],
    [{ code: "SQLITE_ERROR" }, "syntax"],
    [{ name: "AbortError" }, "cancelled"],
    [{ code: 18 }, "unknown"],
  ])("classifies %o as %s", (err, expected) => {
    expect(classifyError(err)).toBe(expected);
  });

  test("returns unknown for null, strings, and code-less errors", () => {
    expect(classifyError(null)).toBe("unknown");
    expect(classifyError("boom")).toBe("unknown");
    expect(classifyError(new Error("connect ECONNREFUSED"))).toBe("unknown");
  });

  test("uses the first classifiable cause of an AggregateError", () => {
    const err = { errors: [{ message: "x" }, { code: "ECONNREFUSED" }] };
    expect(classifyError(err)).toBe("network");
  });

  test("falls back to err.cause", () => {
    expect(classifyError({ cause: { code: "ELOGIN" } })).toBe("auth");
  });
});
