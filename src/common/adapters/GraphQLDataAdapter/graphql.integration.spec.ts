import { afterAll, beforeAll, describe, expect, it } from "vitest";
import GraphQLDataAdapter from "src/common/adapters/GraphQLDataAdapter/index";

/** Public GraphQL endpoint for integration testing (countries API by Trevor Blades). */
const GRAPHQL_ENDPOINT = "https://countries.trevorblades.com/graphql";

/** Skip GraphQL integration tests in CI — the external service may be unreliable. */
const describeGraphQL = process.env.CI ? describe.skip : describe;

describe("GraphQLDataAdapter integration (countries.trevorblades.com)", () => {
  // -- simple queries --

  describeGraphQL("simple queries", () => {
    it("executes a simple __typename query", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{ __typename }`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.graphqlData?.__typename).toBe("Query");
      await adapter.disconnect();
    });

    it("queries list of continents", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{
  continents {
    code
    name
  }
}`);
      expect(result.ok).toBe(true);
      expect(result.meta?.graphqlData?.continents).toBeDefined();
      expect(result.meta?.graphqlData?.continents.length).toBeGreaterThan(0);
      const names = result.meta?.graphqlData?.continents.map((c: any) => c.name);
      expect(names).toContain("Africa");
      expect(names).toContain("Europe");
      await adapter.disconnect();
    });

    it("queries list of countries", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{
  countries {
    code
    name
    capital
  }
}`);
      expect(result.ok).toBe(true);
      const countries = result.meta?.graphqlData?.countries;
      expect(countries).toBeDefined();
      expect(countries.length).toBeGreaterThan(100);
      const us = countries.find((c: any) => c.code === "US");
      expect(us).toBeDefined();
      expect(us.name).toBe("United States");
      expect(us.capital).toBe("Washington, D.C.");
      await adapter.disconnect();
    });

    it("queries a single country by code", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{
  country(code: "JP") {
    name
    capital
    currency
    languages {
      name
    }
  }
}`);
      expect(result.ok).toBe(true);
      const country = result.meta?.graphqlData?.country;
      expect(country.name).toBe("Japan");
      expect(country.capital).toBe("Tokyo");
      expect(country.languages.length).toBeGreaterThan(0);
      await adapter.disconnect();
    });

    it("queries languages", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{
  languages {
    code
    name
    native
  }
}`);
      expect(result.ok).toBe(true);
      const languages = result.meta?.graphqlData?.languages;
      expect(languages).toBeDefined();
      expect(languages.length).toBeGreaterThan(0);
      const en = languages.find((l: any) => l.code === "en");
      expect(en).toBeDefined();
      expect(en.name).toBe("English");
      await adapter.disconnect();
    });
  });

  // -- queries with variables --

  describeGraphQL("queries with variables", () => {
    it("queries country with variable code", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`query GetCountry($code: ID!) {
  country(code: $code) {
    name
    capital
    emoji
  }
}

### Variables
{"code": "BR"}`);
      expect(result.ok).toBe(true);
      const country = result.meta?.graphqlData?.country;
      expect(country.name).toBe("Brazil");
      expect(country.capital).toBe("Brasília");
      expect(country.emoji).toBeDefined();
      await adapter.disconnect();
    });

    it("queries continent with variable code", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`query GetContinent($code: ID!) {
  continent(code: $code) {
    name
    countries {
      code
      name
    }
  }
}

### Variables
{"code": "EU"}`);
      expect(result.ok).toBe(true);
      const continent = result.meta?.graphqlData?.continent;
      expect(continent.name).toBe("Europe");
      expect(continent.countries.length).toBeGreaterThan(0);
      const de = continent.countries.find((c: any) => c.code === "DE");
      expect(de).toBeDefined();
      expect(de.name).toBe("Germany");
      await adapter.disconnect();
    });

    it("queries countries filtered by continent", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`query FilteredCountries($filter: CountryFilterInput) {
  countries(filter: $filter) {
    code
    name
    continent {
      name
    }
  }
}

### Variables
{"filter": {"continent": {"eq": "AF"}}}`);
      expect(result.ok).toBe(true);
      const countries = result.meta?.graphqlData?.countries;
      expect(countries).toBeDefined();
      expect(countries.length).toBeGreaterThan(0);
      // All returned countries should be in Africa
      for (const c of countries) {
        expect(c.continent.name).toBe("Africa");
      }
      await adapter.disconnect();
    });
  });

  // -- queries with headers --

  describeGraphQL("queries with headers", () => {
    it("sends custom headers with request", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{
  continents {
    code
  }
}

### Headers
X-Custom-Header: test-value
Accept-Language: en`);
      expect(result.ok).toBe(true);
      // The query should still succeed even with extra headers
      expect(result.meta?.graphqlData?.continents).toBeDefined();
      // Verify the custom headers were sent (via requestHeaders in meta)
      expect(result.meta?.requestHeaders?.["X-Custom-Header"]).toBe("test-value");
      expect(result.meta?.requestHeaders?.["Accept-Language"]).toBe("en");
      await adapter.disconnect();
    });

    it("merges connection-level headers with request headers", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}","headers":{"X-Connection-Header":"conn-value"}}`);
      const result = await adapter.execute(`{
  continents {
    code
  }
}

### Headers
X-Request-Header: req-value`);
      expect(result.ok).toBe(true);
      expect(result.meta?.requestHeaders?.["X-Connection-Header"]).toBe("conn-value");
      expect(result.meta?.requestHeaders?.["X-Request-Header"]).toBe("req-value");
      await adapter.disconnect();
    });
  });

  // -- queries with operation name --

  describeGraphQL("queries with operation name", () => {
    it("sends operationName with request", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`query ListContinents {
  continents {
    code
    name
  }
}

### Operation
ListContinents`);
      expect(result.ok).toBe(true);
      expect(result.meta?.requestOperationName).toBe("ListContinents");
      expect(result.meta?.graphqlData?.continents).toBeDefined();
      await adapter.disconnect();
    });
  });

  // -- all sections combined --

  describeGraphQL("all sections combined", () => {
    it("handles query with variables, headers, and operation name", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`query GetCountryFull($code: ID!) {
  country(code: $code) {
    name
    capital
    currency
    continent {
      name
    }
  }
}

### Variables
{"code": "FR"}

### Headers
X-Test: combined

### Operation
GetCountryFull`);
      expect(result.ok).toBe(true);
      const country = result.meta?.graphqlData?.country;
      expect(country.name).toBe("France");
      expect(country.capital).toBe("Paris");
      expect(country.continent.name).toBe("Europe");
      expect(result.meta?.requestOperationName).toBe("GetCountryFull");
      expect(result.meta?.requestHeaders?.["X-Test"]).toBe("combined");
      await adapter.disconnect();
    });
  });

  // -- variable resolution --

  describeGraphQL("variable resolution", () => {
    it("resolves {{ENDPOINT}} from connection config", async () => {
      const adapter = new GraphQLDataAdapter(
        `graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}","variables":[{"key":"COUNTRY_CODE","value":"DE","enabled":true}]}`,
      );
      // ENDPOINT is auto-injected as a variable but is primarily used internally for the request URL
      const result = await adapter.execute(`{
  country(code: "DE") {
    name
  }
}`);
      expect(result.ok).toBe(true);
      expect(result.meta?.requestEndpoint).toBe(GRAPHQL_ENDPOINT);
      await adapter.disconnect();
    });

    it("resolves collection variables in query text", async () => {
      const adapter = new GraphQLDataAdapter(
        `graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}","variables":[{"key":"MY_CODE","value":"IT","enabled":true}]}`,
      );
      // Use variable in inline argument (the API expects a literal string, not a GraphQL variable)
      const result = await adapter.execute(`{
  country(code: "{{MY_CODE}}") {
    name
    capital
  }
}`);
      expect(result.ok).toBe(true);
      const country = result.meta?.graphqlData?.country;
      expect(country.name).toBe("Italy");
      expect(country.capital).toBe("Rome");
      await adapter.disconnect();
    });

    it("ignores disabled variables", async () => {
      const config = JSON.stringify({
        ENDPOINT: GRAPHQL_ENDPOINT,
        variables: [{ key: "DISABLED_VAR", value: "should-not-appear", enabled: false }],
      });
      const adapter = new GraphQLDataAdapter(`graphql://${config}`);
      const result = await adapter.execute(`{
  country(code: "{{DISABLED_VAR}}") {
    name
  }
}`);
      expect(result.ok).toBe(true);
      // The unresolved variable should be detected
      expect(result.meta?.unresolvedVariables).toContain("DISABLED_VAR");
      await adapter.disconnect();
    });
  });

  // -- introspection --

  describeGraphQL("introspection", () => {
    it("fetches full schema introspection", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{
  __schema {
    queryType { name }
    types {
      name
      kind
    }
  }
}`);
      expect(result.ok).toBe(true);
      const schema = result.meta?.graphqlData?.__schema;
      expect(schema).toBeDefined();
      expect(schema.queryType.name).toBe("Query");
      const typeNames = schema.types.map((t: any) => t.name);
      expect(typeNames).toContain("Country");
      expect(typeNames).toContain("Continent");
      expect(typeNames).toContain("Language");
      await adapter.disconnect();
    });

    it("fetches type details for Country", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{
  __type(name: "Country") {
    name
    kind
    fields {
      name
      type {
        name
        kind
      }
    }
  }
}`);
      expect(result.ok).toBe(true);
      const type = result.meta?.graphqlData?.__type;
      expect(type.name).toBe("Country");
      expect(type.kind).toBe("OBJECT");
      const fieldNames = type.fields.map((f: any) => f.name);
      expect(fieldNames).toContain("code");
      expect(fieldNames).toContain("name");
      expect(fieldNames).toContain("capital");
      expect(fieldNames).toContain("continent");
      await adapter.disconnect();
    });
  });

  // -- response metadata --

  describeGraphQL("response metadata", () => {
    it("returns timing data", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{ __typename }`);
      expect(result.ok).toBe(true);
      expect(result.meta?.timing?.total).toBeGreaterThan(0);
      await adapter.disconnect();
    });

    it("returns response size", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{ continents { code name } }`);
      expect(result.ok).toBe(true);
      expect(result.meta?.size).toBeGreaterThan(0);
      await adapter.disconnect();
    });

    it("returns response headers", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{ __typename }`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseHeaders).toBeDefined();
      const contentType = result.meta?.responseHeaders?.["Content-Type"] || result.meta?.responseHeaders?.["content-type"];
      expect(contentType).toContain("application/json");
      await adapter.disconnect();
    });

    it("returns raw response body", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{ __typename }`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBody).toBeDefined();
      expect(result.meta?.responseBody).toContain("__typename");
      await adapter.disconnect();
    });

    it("populates request metadata in result", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`query GetCountry($code: ID!) {
  country(code: $code) {
    name
  }
}

### Variables
{"code": "CA"}`);
      expect(result.ok).toBe(true);
      expect(result.meta?.requestEndpoint).toBe(GRAPHQL_ENDPOINT);
      expect(result.meta?.requestQuery).toContain("GetCountry");
      expect(result.meta?.requestVariables?.code).toBe("CA");
      expect(result.meta?.isGraphQL).toBe(true);
      await adapter.disconnect();
    });
  });

  // -- error handling --

  describe("error handling", () => {
    it("returns error for empty input", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute("");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("No query to execute");
      await adapter.disconnect();
    });

    it("returns error for whitespace-only input", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute("   \n\t  ");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("No query to execute");
      await adapter.disconnect();
    });

    it("returns error when no ENDPOINT is configured", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{}`);
      const result = await adapter.execute(`{ __typename }`);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("No ENDPOINT configured");
      await adapter.disconnect();
    });
  });

  describeGraphQL("GraphQL error responses", () => {
    it("handles invalid query syntax (returns GraphQL errors)", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`{ thisFieldDoesNotExist }`);
      expect(result.ok).toBe(true);
      // The HTTP request succeeds but GraphQL returns errors
      expect(result.meta?.graphqlErrors).toBeDefined();
      expect(result.meta?.graphqlErrors?.length).toBeGreaterThan(0);
      expect(result.meta?.graphqlErrors?.[0]?.message).toBeDefined();
      await adapter.disconnect();
    });

    it("handles malformed query gracefully", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const result = await adapter.execute(`query { }`);
      expect(result.ok).toBe(true);
      // Server should return errors for empty selection set
      expect(result.meta?.graphqlErrors).toBeDefined();
      await adapter.disconnect();
    });
  });

  // -- authenticate --

  describe("authenticate", () => {
    it("succeeds with valid ENDPOINT", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      await expect(adapter.authenticate()).resolves.toBeUndefined();
      await adapter.disconnect();
    });

    it("succeeds with empty config (no ENDPOINT)", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{}`);
      await expect(adapter.authenticate()).resolves.toBeUndefined();
      await adapter.disconnect();
    });

    it("rejects invalid ENDPOINT format (no scheme)", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"not-a-url"}`);
      await expect(adapter.authenticate()).rejects.toThrow("Invalid ENDPOINT format");
      await adapter.disconnect();
    });

    it("rejects unresolvable ENDPOINT domain", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"https://this-domain-definitely-does-not-exist-xyz123.com/graphql"}`);
      await expect(adapter.authenticate()).rejects.toThrow("Cannot resolve host");
      await adapter.disconnect();
    });
  });

  // -- diagnostics --

  describeGraphQL("diagnostics", () => {
    it("runDiagnostics returns introspection result", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{"ENDPOINT":"${GRAPHQL_ENDPOINT}"}`);
      const results = await adapter.runDiagnostics();
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Introspection");
      expect(results[0].success).toBe(true);
      expect(results[0].message).toMatch(/^200/);
      await adapter.disconnect();
    });

    it("runDiagnostics returns empty array when no ENDPOINT", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{}`);
      const results = await adapter.runDiagnostics();
      expect(results).toEqual([]);
      await adapter.disconnect();
    });
  });

  // -- adapter lifecycle --

  describe("adapter lifecycle", () => {
    it("getDatabases returns empty array (folders are managed externally)", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{}`);
      const dbs = await adapter.getDatabases();
      expect(dbs).toHaveLength(0);
      await adapter.disconnect();
    });

    it("getTables returns empty array", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{}`);
      const tables = await adapter.getTables("Default");
      expect(tables).toEqual([]);
      await adapter.disconnect();
    });

    it("getColumns returns GraphQL request metadata fields", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{}`);
      const cols = await adapter.getColumns("test", "Default");
      const names = cols.map((c) => c.name);
      expect(names).toContain("query");
      expect(names).toContain("variables");
      expect(names).toContain("operationName");
      expect(names).toContain("headers");
      await adapter.disconnect();
    });

    it("disconnect is a no-op", async () => {
      const adapter = new GraphQLDataAdapter(`graphql://{}`);
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });
});
