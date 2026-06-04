// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

vi.mock("src/frontend/components/CodeEditorBox", () => ({
  default: ({ value, language }: any) => <pre data-language={language}>{value}</pre>,
}));
vi.mock("src/frontend/components/Tabs", () => ({
  default: ({ tabHeaders, tabContents, tabIdx }: any) => (
    <div>
      <div>headers:{tabHeaders.length}</div>
      <div data-tabidx={tabIdx}>{tabContents[tabIdx]}</div>
    </div>
  ),
}));
vi.mock("src/frontend/components/Timer", () => ({
  default: () => <span>Timer</span>,
}));
vi.mock("src/frontend/data/file", () => ({ downloadJSON: vi.fn() }));
vi.mock("src/frontend/hooks/useDownloadResultToast", () => ({
  useDownloadResultToast: () => ({ downloadResult: vi.fn(async () => ({ kind: "cancelled" })) }),
}));

import RestApiResultBox, { formatBytes } from "src/frontend/components/ResultBox/RestApiResultBox";
import GraphQLResultBox from "src/frontend/components/ResultBox/GraphQLResultBox";

describe("formatBytes", () => {
  test("bytes under 1KB", () => {
    expect(formatBytes(500)).toBe("500 B");
  });
  test("kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });
  test("megabytes", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
  test("zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("RestApiResultBox", () => {
  const baseMeta = {
    status: 200,
    statusText: "OK",
    requestMethod: "GET",
    requestUrl: "https://example.com/api",
    responseBody: '{"hello":"world"}',
    responseHeaders: { "Content-Type": "application/json" },
    responseCookies: { sid: "abc" },
    timing: { dns: 5, tcp: 10 },
    size: 100,
  };
  test("renders 200 status with all sections", () => {
    const { container } = render(<RestApiResultBox meta={baseMeta} raw={[{}]} executionStart={1} executionEnd={2} />);
    expect(container.textContent).toContain("200 OK");
    expect(container.textContent).toContain("GET");
    expect(container.textContent).toContain("example.com");
    expect(container.textContent).toContain("headers:5");
  });

  test("unresolved variables warning shown", () => {
    const { container } = render(<RestApiResultBox meta={{ ...baseMeta, unresolvedVariables: ["token", "host"] }} raw={[{}]} />);
    expect(container.textContent).toContain("Unresolved variables");
    expect(container.textContent).toContain("{{token}}");
  });

  test("error status (5xx) renders warning alert", () => {
    const { container } = render(<RestApiResultBox meta={{ ...baseMeta, status: 500, statusText: "Server Error" }} raw={[{}]} />);
    expect(container.textContent).toContain("500 Server Error");
  });

  test("empty body and 0 status handled", () => {
    const { container } = render(<RestApiResultBox meta={{ status: 0, responseBody: "" }} raw={[{}]} />);
    expect(container.textContent).toContain("empty response");
  });

  test("HTML body detected", () => {
    const { container } = render(<RestApiResultBox meta={{ status: 200, responseBody: "<html><body>x</body></html>" }} raw={[{}]} />);
    expect(container.querySelector('[data-language="html"]')).toBeTruthy();
  });

  test("JSON string in body is parsed", () => {
    const { container } = render(<RestApiResultBox meta={{ status: 200, responseBody: '{"x":1}' }} raw={[{}]} />);
    expect(container.querySelector('[data-language="json"]')).toBeTruthy();
  });

  test("invalid JSON string falls back to text", () => {
    const { container } = render(<RestApiResultBox meta={{ status: 200, responseBody: "{notjson" }} raw={[{}]} />);
    expect(container.querySelector('[data-language="text"]')).toBeTruthy();
  });
});

describe("GraphQLResultBox", () => {
  const baseMeta = {
    status: 200,
    statusText: "OK",
    requestEndpoint: "https://example.com/graphql",
    requestQuery: "query { hello }",
    graphqlData: { hello: "world" },
    graphqlErrors: [],
    responseHeaders: { "Content-Type": "application/json" },
    timing: { total: 50 },
    size: 200,
  };
  test("renders data tab with success status", () => {
    const { container } = render(<GraphQLResultBox meta={baseMeta} raw={[{}]} executionStart={1} executionEnd={2} />);
    expect(container.textContent).toContain("200 OK");
    expect(container.textContent).toContain("headers:6");
    expect(container.textContent).toContain("hello");
  });

  test("errors with no data shows error alert and auto-selects Errors tab", () => {
    const { container } = render(
      <GraphQLResultBox
        meta={{
          ...baseMeta,
          graphqlData: null,
          graphqlErrors: [{ message: "boom" }],
        }}
        raw={[{}]}
      />,
    );
    expect(container.textContent).toContain("1 error");
    expect(container.textContent).toContain("no data");
  });

  test("partial data with errors shows warning alert", () => {
    const { container } = render(
      <GraphQLResultBox
        meta={{
          ...baseMeta,
          graphqlErrors: [{ message: "warn" }, { message: "warn2" }],
        }}
        raw={[{}]}
      />,
    );
    expect(container.textContent).toContain("partial data");
    expect(container.textContent).toContain("2 errors");
  });

  test("extensions alert rendered", () => {
    const { container } = render(<GraphQLResultBox meta={{ ...baseMeta, graphqlExtensions: { trace: 1 } }} raw={[{}]} />);
    expect(container.textContent).toContain("Server extensions");
  });

  test("unresolved variables warning rendered", () => {
    const { container } = render(<GraphQLResultBox meta={{ ...baseMeta, unresolvedVariables: ["userId"] }} raw={[{}]} />);
    expect(container.textContent).toContain("Unresolved variables");
    expect(container.textContent).toContain("{{userId}}");
  });

  test("status >= 400 chip uses warning alert", () => {
    const { container } = render(<GraphQLResultBox meta={{ ...baseMeta, status: 400, statusText: "Bad Request" }} raw={[{}]} />);
    expect(container.textContent).toContain("400 Bad Request");
  });

  test("status 3xx", () => {
    const { container } = render(<GraphQLResultBox meta={{ ...baseMeta, status: 301, statusText: "Moved" }} raw={[{}]} />);
    expect(container.textContent).toContain("301 Moved");
  });

  test("status 0 default", () => {
    const { container } = render(<GraphQLResultBox meta={{}} raw={[{}]} />);
    expect(container.textContent).toBeTruthy();
  });
});
