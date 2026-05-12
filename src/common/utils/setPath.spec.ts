import { describe, expect, it } from "vitest";

import { setPath } from "src/common/utils/setPath";

describe("setPath", () => {
  it("sets a simple nested path", () => {
    expect(setPath({}, "a.b.c", 1)).toEqual({ a: { b: { c: 1 } } });
  });

  it("accepts an array path of string segments", () => {
    expect(setPath({}, ["a", "b"], 1)).toEqual({ a: { b: 1 } });
  });

  it("creates intermediate arrays for numeric bracket segments", () => {
    expect(setPath({}, "a[0]", 1)).toEqual({ a: [1] });
  });

  it("creates arrays when a dotted segment is all digits", () => {
    const result = setPath({}, "a.0", 1);
    expect(Array.isArray((result as { a: unknown }).a)).toBe(true);
    expect(result).toEqual({ a: [1] });
  });

  it("creates a mix of arrays and objects", () => {
    expect(setPath({}, "a[0].b", 1)).toEqual({ a: [{ b: 1 }] });
  });

  it("overwrites an existing leaf value", () => {
    expect(setPath({ a: 1 }, "a", 2)).toEqual({ a: 2 });
  });

  it("preserves sibling properties", () => {
    expect(setPath({ a: { b: 1 } }, "a.c", 2)).toEqual({ a: { b: 1, c: 2 } });
  });

  it("returns the same object reference", () => {
    const obj = {};
    const result = setPath(obj, "a", 1);
    expect(result).toBe(obj);
  });

  it("is a no-op for an empty path", () => {
    const obj = { a: 1 };
    expect(setPath(obj, "", 2)).toBe(obj);
    expect(obj).toEqual({ a: 1 });
  });

  it("handles array-path with numeric segments", () => {
    expect(setPath({}, ["a", 0, "b"], "x")).toEqual({ a: [{ b: "x" }] });
  });

  it("replaces a non-object intermediate with the right container", () => {
    expect(setPath({ a: 1 }, "a.b", 2)).toEqual({ a: { b: 2 } });
  });

  it("replaces a null intermediate with an object", () => {
    expect(setPath({ a: null } as Record<string, unknown>, "a.b", 2)).toEqual({ a: { b: 2 } });
  });

  // The propertyPath call sites pass either `string[]` (from BaseDataAdapter)
  // or the bare `column.name` string. Cover both shapes directly.
  it("matches call-site usage: array propertyPath with dotted parents", () => {
    const target: Record<string, unknown> = {};
    setPath(target, ["address", "city"], "");
    expect(target).toEqual({ address: { city: "" } });
  });

  it("matches call-site usage: plain column.name string", () => {
    const target: Record<string, unknown> = {};
    setPath(target, "name", "abc");
    expect(target).toEqual({ name: "abc" });
  });

  it("matches call-site usage: deeper array propertyPath", () => {
    const target: Record<string, unknown> = {};
    setPath(target, ["l1", "l2", "l3"], 123);
    expect(target).toEqual({ l1: { l2: { l3: 123 } } });
  });
});
