import { describe, test, expect } from "vitest";
import GraphQLDataAdapterScripts, {
  getSimpleQuery,
  getQueryWithVariables,
  getQueryWithHeaders,
  getSearchQuery,
  getCreateMutation,
  getUpdateMutation,
  getDeleteMutation,
  getSubscription,
  getIntrospectionQuery,
  getIntrospectionTypesOnly,
} from "src/common/adapters/GraphQLDataAdapter/scripts";

const fakeInput: any = { connectionId: "c", databaseId: "db", tableId: "t", dialect: "graphql" };

describe("GraphQLDataAdapter scripts — template generators", () => {
  test.each([
    ["getSimpleQuery", getSimpleQuery, "continents"],
    ["getQueryWithVariables", getQueryWithVariables, "Variables"],
    ["getQueryWithHeaders", getQueryWithHeaders, "Authorization"],
    ["getSearchQuery", getSearchQuery, "FilterCountries"],
    ["getCreateMutation", getCreateMutation, "createItem"],
    ["getUpdateMutation", getUpdateMutation, "updateItem"],
    ["getDeleteMutation", getDeleteMutation, "deleteItem"],
    ["getSubscription", getSubscription, "subscription"],
    ["getIntrospectionQuery", getIntrospectionQuery, "__schema"],
    ["getIntrospectionTypesOnly", getIntrospectionTypesOnly, "__schema"],
  ])("%s returns labeled GraphQL with %s text", (_, fn: any, needle) => {
    const out = fn(fakeInput);
    expect(out).toBeDefined();
    expect(out?.label).toBeDefined();
    expect(out?.formatter).toBe("graphql");
    expect(out?.query).toContain(needle);
  });
});

describe("ConcreteDataScripts class", () => {
  test("dialect metadata", () => {
    expect(GraphQLDataAdapterScripts.dialects).toContain("graphql");
    expect(GraphQLDataAdapterScripts.getDialectType("anything")).toBe("graphql");
    expect(GraphQLDataAdapterScripts.getDialectName("anything")).toBe("GraphQL");
    expect(typeof GraphQLDataAdapterScripts.getDialectIcon("anything")).toBe("string");
  });

  test("connection form metadata", () => {
    expect(GraphQLDataAdapterScripts.getConnectionStringFormat()).toBe("json");
    const inputs = GraphQLDataAdapterScripts.getConnectionFormInputs();
    expect(inputs.find((i: any) => i[0] === "ENDPOINT")).toBeDefined();
  });

  test("feature flags", () => {
    expect(GraphQLDataAdapterScripts.getIsTableIdRequiredForQuery()).toBe(false);
    expect(GraphQLDataAdapterScripts.getSyntaxMode()).toBe("graphql");
    expect(GraphQLDataAdapterScripts.supportMigration()).toBe(false);
    expect(GraphQLDataAdapterScripts.supportManagedMetadata()).toBe(true);
    expect(GraphQLDataAdapterScripts.supportCreateRecordForm()).toBe(false);
    expect(GraphQLDataAdapterScripts.supportEditRecordForm()).toBe(false);
    expect(GraphQLDataAdapterScripts.supportVisualization()).toBe(false);
  });

  test("table scripts list contains templates", () => {
    const scripts = GraphQLDataAdapterScripts.getTableScripts();
    expect(scripts.length).toBeGreaterThan(5);
  });

  test("database scripts and connection scripts are empty", () => {
    expect(GraphQLDataAdapterScripts.getDatabaseScripts()).toEqual([]);
    expect(GraphQLDataAdapterScripts.getConnectionScripts()).toEqual([]);
  });

  test("sample connection string is well-formed", () => {
    const s = GraphQLDataAdapterScripts.getSampleConnectionString("graphql");
    expect(s).toMatch(/^graphql:\/\//);
    expect(s).toContain("ENDPOINT");
  });

  test("connection setup guide contains key strings", () => {
    const g = GraphQLDataAdapterScripts.getConnectionSetupGuide();
    expect(g).toContain("GraphQL API Setup");
    expect(g).toContain("Authentication");
  });

  test("getSampleSelectQuery delegates to getSimpleQuery", () => {
    const s = GraphQLDataAdapterScripts.getSampleSelectQuery(fakeInput);
    expect(s?.label).toBe("Simple Query");
  });

  test("getCodeSnippet returns empty when sql is empty", () => {
    expect(GraphQLDataAdapterScripts.getCodeSnippet({} as any, { sql: "" } as any, "fetch")).toBe("");
    expect(GraphQLDataAdapterScripts.getCodeSnippet({} as any, { sql: "   " } as any, "fetch")).toBe("");
  });

  test("getCodeSnippet returns a string for a valid query", () => {
    const out = GraphQLDataAdapterScripts.getCodeSnippet(
      {} as any,
      { sql: "{ continents { code name } }" } as any,
      "fetch",
    );
    expect(typeof out).toBe("string");
  });
});
