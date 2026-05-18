// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));
vi.mock("src/frontend/components/CodeEditorBox", () => ({
  default: ({ value, language }: any) => (
    <pre data-language={language} data-testid="code-editor">
      {value}
    </pre>
  ),
}));
vi.mock("src/frontend/components/DataTable", () => ({
  DataTableWithJSONList: ({ data }: any) => <div>DataTableWithJSONList:{data?.length ?? 0}</div>,
}));
vi.mock("src/frontend/components/JsonFormatData", () => ({
  default: ({ data }: any) => <div>JsonFormatData:{Array.isArray(data) ? data.length : 0}</div>,
}));
vi.mock("src/frontend/components/ResultBox/GraphQLResultBox", () => ({
  default: () => <div>GraphQLResultBox</div>,
}));
vi.mock("src/frontend/components/ResultBox/RestApiResultBox", () => ({
  default: () => <div>RestApiResultBox</div>,
}));
vi.mock("src/frontend/components/Tabs", () => ({
  default: ({ tabHeaders, tabContents, tabIdx }: any) => (
    <div data-testid="tabs">
      <div>headers:{tabHeaders.length}</div>
      <div>{tabContents[tabIdx]}</div>
    </div>
  ),
}));
vi.mock("src/frontend/components/Timer", () => ({
  default: () => <span>Timer</span>,
}));
vi.mock("src/frontend/data/file", () => ({
  downloadCsv: vi.fn(),
  downloadJSON: vi.fn(),
}));

import ResultBox from "src/frontend/components/ResultBox";

const baseQuery: any = {
  id: "q1",
  connectionId: "c1",
  databaseId: "db",
  tableId: "tbl",
  sql: "SELECT 1",
  executionStart: 1000,
  executionEnd: 2000,
  result: undefined,
};

describe("ResultBox", () => {
  test("executing shows Loading alert", () => {
    const { container } = render(<ResultBox query={baseQuery} executing={true} />);
    expect(container.textContent).toContain("Loading");
  });

  test("error renders CodeEditorBox", () => {
    const query = { ...baseQuery, result: { error: { msg: "boom" } } } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("boom");
  });

  test("error with string", () => {
    const query = { ...baseQuery, result: { error: "Simple Error" } } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("Simple Error");
  });

  test("no query result returns null", () => {
    const { container } = render(<ResultBox query={baseQuery} executing={false} />);
    expect(container.textContent).toBe("");
  });

  test("GraphQL result branch", () => {
    const query = {
      ...baseQuery,
      result: { raw: [{ x: 1 }], meta: { isGraphQL: true } },
    } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("GraphQLResultBox");
  });

  test("REST API result branch", () => {
    const query = {
      ...baseQuery,
      result: { raw: [{ x: 1 }], meta: { isRestApi: true } },
    } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("RestApiResultBox");
  });

  test("non-array data renders JsonFormatData (INSERT/UPDATE)", () => {
    const query = {
      ...baseQuery,
      result: { raw: { affectedRows: 5 }, meta: {} },
    } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("JsonFormatData");
  });

  test("array data renders Tabs with Table/JSON tab headers", () => {
    const query = {
      ...baseQuery,
      result: { raw: [{ a: 1 }, { a: 2 }], meta: {} },
    } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("Query took");
    expect(container.textContent).toContain("returned 2 records");
    expect(container.textContent).toContain("headers:2");
  });

  test("array data with executionDetails adds third Query Details tab", () => {
    const query = {
      ...baseQuery,
      executionDetails: { foo: "bar" },
      result: { raw: [{ a: 1 }], meta: {} },
    } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("headers:3");
  });

  test("isSnapshot renders snapshot warning alert", () => {
    const query = {
      ...baseQuery,
      isSnapshot: true,
      result: { raw: [{ a: 1 }], meta: {} },
    } as any;
    const { container } = render(<ResultBox query={query} executing={false} />);
    expect(container.textContent).toContain("Restored snapshot");
  });
});
