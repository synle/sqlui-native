import { vi } from "vitest";

vi.mock("src/common/adapters/RestApiDataAdapter/curlExecutor", () => ({
  executeCurl: vi.fn(),
}));

import { executeCurl } from "src/common/adapters/RestApiDataAdapter/curlExecutor";
import { executeGraphQL } from "src/common/adapters/GraphQLDataAdapter/graphqlExecutor";

const mockedExecuteCurl = executeCurl as unknown as ReturnType<typeof vi.fn>;

describe("executeGraphQL", () => {
  beforeEach(() => {
    mockedExecuteCurl.mockReset();
    mockedExecuteCurl.mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: '{"data":{"hello":"world"}}',
      bodyParsed: { data: { hello: "world" } },
      timing: { timeTotal: 0.1 },
      size: { download: 27 },
    });
  });

  test("issues a POST with JSON body to the configured endpoint", async () => {
    await executeGraphQL({ query: "{ hello }", headers: {} }, "https://api.example.com/graphql");

    expect(mockedExecuteCurl).toHaveBeenCalledTimes(1);
    const [request, timeoutMs] = mockedExecuteCurl.mock.calls[0];
    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://api.example.com/graphql");
    expect(request.headers["Content-Type"]).toBe("application/json");
    expect(request.headers.Accept).toBe("application/json");
    expect(JSON.parse(request.body)).toEqual({ query: "{ hello }" });
    expect(timeoutMs).toBe(30_000);
  });

  test("includes variables and operationName when provided", async () => {
    await executeGraphQL(
      {
        query: "query Foo($id: ID!) { node(id: $id) { id } }",
        variables: { id: "abc" },
        operationName: "Foo",
        headers: {},
      },
      "https://api.example.com/graphql",
    );

    const [request] = mockedExecuteCurl.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({
      query: "query Foo($id: ID!) { node(id: $id) { id } }",
      variables: { id: "abc" },
      operationName: "Foo",
    });
  });

  test("omits variables when empty", async () => {
    await executeGraphQL(
      { query: "{ ping }", variables: {}, headers: {} },
      "https://api.example.com/graphql",
    );

    const [request] = mockedExecuteCurl.mock.calls[0];
    const parsed = JSON.parse(request.body);
    expect(parsed.variables).toBeUndefined();
    expect(parsed.operationName).toBeUndefined();
  });

  test("merges request headers on top of defaults", async () => {
    await executeGraphQL(
      {
        query: "{ ping }",
        headers: {
          Authorization: "Bearer t",
          Accept: "application/graphql+json",
        },
      },
      "https://api.example.com/graphql",
    );

    const [request] = mockedExecuteCurl.mock.calls[0];
    expect(request.headers.Authorization).toBe("Bearer t");
    // request headers override the defaults
    expect(request.headers.Accept).toBe("application/graphql+json");
    expect(request.headers["Content-Type"]).toBe("application/json");
  });

  test("passes through a custom timeout", async () => {
    await executeGraphQL(
      { query: "{ ping }", headers: {} },
      "https://api.example.com/graphql",
      5000,
    );
    const [, timeoutMs] = mockedExecuteCurl.mock.calls[0];
    expect(timeoutMs).toBe(5000);
  });

  test("returns the parsed GraphQL response shape", async () => {
    const result = await executeGraphQL(
      { query: "{ hello }", headers: {} },
      "https://api.example.com/graphql",
    );

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.bodyParsed).toEqual({
      data: { hello: "world" },
      errors: undefined,
      extensions: undefined,
    });
    expect(result.body).toBe('{"data":{"hello":"world"}}');
  });

  test("propagates GraphQL errors and extensions in bodyParsed", async () => {
    mockedExecuteCurl.mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: {},
      body: '{"errors":[{"message":"oops"}],"extensions":{"requestId":"r1"}}',
      bodyParsed: {
        data: null,
        errors: [{ message: "oops" }],
        extensions: { requestId: "r1" },
        ignored: "drop me",
      },
      timing: {},
      size: {},
    });

    const result = await executeGraphQL(
      { query: "{ broken }", headers: {} },
      "https://api.example.com/graphql",
    );
    expect(result.bodyParsed).toEqual({
      data: null,
      errors: [{ message: "oops" }],
      extensions: { requestId: "r1" },
    });
    // ensure we strip unknown fields, not pass through whole object
    expect((result.bodyParsed as Record<string, unknown>).ignored).toBeUndefined();
  });

  test("leaves bodyParsed undefined when the response body is not JSON", async () => {
    mockedExecuteCurl.mockResolvedValue({
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      body: "<html>oops</html>",
      bodyParsed: undefined,
      timing: {},
      size: {},
    });

    const result = await executeGraphQL(
      { query: "{ broken }", headers: {} },
      "https://api.example.com/graphql",
    );
    expect(result.bodyParsed).toBeUndefined();
    expect(result.status).toBe(500);
  });
});
