import { describe, expect, it } from "vitest";
import { parseGraphQLInput } from "src/common/adapters/GraphQLDataAdapter/graphqlParser";

describe("parseGraphQLInput", () => {
  it("should parse a plain query with no sections", () => {
    const result = parseGraphQLInput("{ users { id name } }");
    expect(result.query).toBe("{ users { id name } }");
    expect(result.variables).toBeUndefined();
    expect(result.operationName).toBeUndefined();
    expect(result.headers).toEqual({});
  });

  it("should parse a query with variables section", () => {
    const input = `query GetUsers($limit: Int) {
  users(limit: $limit) { id }
}

### Variables
{"limit": 10}`;

    const result = parseGraphQLInput(input);
    expect(result.query).toContain("query GetUsers");
    expect(result.variables).toEqual({ limit: 10 });
  });

  it("should parse a query with headers section", () => {
    const input = `{ users { id } }

### Headers
Authorization: Bearer my-token
X-Custom: value`;

    const result = parseGraphQLInput(input);
    expect(result.query).toBe("{ users { id } }");
    expect(result.headers).toEqual({
      Authorization: "Bearer my-token",
      "X-Custom": "value",
    });
  });

  it("should parse a query with operation name section", () => {
    const input = `query GetUsers { users { id } }
query GetPosts { posts { id } }

### Operation
GetUsers`;

    const result = parseGraphQLInput(input);
    expect(result.operationName).toBe("GetUsers");
  });

  it("should parse all sections combined", () => {
    const input = `query GetUsers($limit: Int) {
  users(limit: $limit) { id name }
}

### Variables
{"limit": 10, "offset": 0}

### Headers
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

### Operation
GetUsers`;

    const result = parseGraphQLInput(input);
    expect(result.query).toContain("query GetUsers");
    expect(result.variables).toEqual({ limit: 10, offset: 0 });
    expect(result.headers["Authorization"]).toBe("Bearer {{ACCESS_TOKEN}}");
    expect(result.headers["Content-Type"]).toBe("application/json");
    expect(result.operationName).toBe("GetUsers");
  });

  it("should handle sections in any order", () => {
    const input = `{ users { id } }

### Operation
MyOp

### Variables
{"key": "value"}

### Headers
X-Test: 123`;

    const result = parseGraphQLInput(input);
    expect(result.query).toBe("{ users { id } }");
    expect(result.operationName).toBe("MyOp");
    expect(result.variables).toEqual({ key: "value" });
    expect(result.headers["X-Test"]).toBe("123");
  });

  it("should throw on empty input", () => {
    expect(() => parseGraphQLInput("")).toThrow("No GraphQL query to execute");
    expect(() => parseGraphQLInput("   ")).toThrow("No GraphQL query to execute");
  });

  it("should throw on malformed variables JSON", () => {
    const input = `{ users { id } }

### Variables
{invalid json}`;

    expect(() => parseGraphQLInput(input)).toThrow("Invalid JSON in ### Variables section");
  });

  it("should throw when only sections are present but no query", () => {
    const input = `### Variables
{"limit": 10}`;

    expect(() => parseGraphQLInput(input)).toThrow("No GraphQL query found");
  });

  it("should skip empty lines in headers section", () => {
    const input = `{ users { id } }

### Headers

Authorization: Bearer token

`;

    const result = parseGraphQLInput(input);
    expect(result.headers).toEqual({ Authorization: "Bearer token" });
  });

  it("should handle empty variables section gracefully", () => {
    const input = `{ users { id } }

### Variables
`;

    const result = parseGraphQLInput(input);
    expect(result.variables).toBeUndefined();
  });

  it("should preserve header values containing colons", () => {
    const input = `{ users { id } }

### Headers
Authorization: Bearer abc:def:ghi`;

    const result = parseGraphQLInput(input);
    expect(result.headers["Authorization"]).toBe("Bearer abc:def:ghi");
  });

  it("should handle multiline GraphQL queries", () => {
    const input = `mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}

### Variables
{"input": {"name": "Acme User", "email": "user@acme.com"}}`;

    const result = parseGraphQLInput(input);
    expect(result.query).toContain("mutation CreateUser");
    expect(result.query).toContain("createUser(input: $input)");
    expect(result.variables?.input?.name).toBe("Acme User");
  });
});
