import { describe, test, expect } from "vitest";
import RestApiScripts, {
  getSimpleGet,
  getGetWithAuth,
  getPostJson,
  getPutJson,
  getPatchJson,
  getDeleteRequest,
  getFormPost,
  getFileUpload,
  getBasicAuth,
  getWithQueryParams,
  getFetchGet,
  getFetchPost,
} from "src/common/adapters/RestApiDataAdapter/scripts";

const fakeInput: any = { connectionId: "c", databaseId: "db", tableId: "t", dialect: "rest" };

describe("RestApi script templates", () => {
  test.each([
    ["getSimpleGet", getSimpleGet, /\/get/],
    ["getGetWithAuth", getGetWithAuth, /Authorization/],
    ["getPostJson", getPostJson, /POST/],
    ["getPutJson", getPutJson, /PUT/],
    ["getPatchJson", getPatchJson, /PATCH/],
    ["getDeleteRequest", getDeleteRequest, /DELETE/],
    ["getFormPost", getFormPost, /field1=value1/i],
    ["getFileUpload", getFileUpload, /file/i],
    ["getBasicAuth", getBasicAuth, /Basic|user|password/i],
    ["getWithQueryParams", getWithQueryParams, /\?|query/i],
    ["getFetchGet", getFetchGet, /fetch/],
    ["getFetchPost", getFetchPost, /fetch/],
  ])("%s returns a labeled template", (_, fn: any, needle) => {
    const out = fn(fakeInput);
    expect(out?.label).toBeDefined();
    expect(out?.query).toMatch(needle);
  });
});

describe("RestApi ConcreteDataScripts", () => {
  test("dialect metadata", () => {
    expect(RestApiScripts.dialects).toContain("rest");
    expect(RestApiScripts.getDialectName("rest")).toMatch(/REST/i);
    expect(typeof RestApiScripts.getDialectIcon("rest")).toBe("string");
  });

  test("feature flags", () => {
    expect(RestApiScripts.supportMigration()).toBe(false);
    expect(RestApiScripts.supportManagedMetadata()).toBe(true);
    expect(RestApiScripts.supportVisualization()).toBe(false);
  });

  test("getSampleConnectionString is well-formed", () => {
    const s = RestApiScripts.getSampleConnectionString("rest");
    expect(s).toMatch(/^rest:\/\//);
  });

  test("getConnectionSetupGuide returns guide HTML", () => {
    const g = RestApiScripts.getConnectionSetupGuide();
    expect(typeof g).toBe("string");
    expect(g.length).toBeGreaterThan(50);
  });

  test("getTableScripts returns several entries", () => {
    expect(RestApiScripts.getTableScripts().length).toBeGreaterThan(5);
  });

  test("getCodeSnippet returns empty when sql is empty", () => {
    expect(RestApiScripts.getCodeSnippet({} as any, { sql: "" } as any, "fetch")).toBe("");
  });

  test("getCodeSnippet returns a string for a curl input", () => {
    const out = RestApiScripts.getCodeSnippet({} as any, { sql: "curl 'https://api.example.com'" } as any, "fetch");
    expect(typeof out).toBe("string");
  });
});
