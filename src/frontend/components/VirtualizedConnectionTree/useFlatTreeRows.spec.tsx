// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const useGetConnectionsMock = vi.fn();
const useUpdateConnectionsMock = vi.fn();
const useAutoConnectAllMock = vi.fn();
const useShowHideMock = vi.fn();
const useActiveConnectionQueryMock = vi.fn();
const isDialectSupportManagedMetadataMock = vi.fn();

const getConnectionDatabasesMock = vi.fn();
const getConnectionTablesMock = vi.fn();
const getConnectionColumnsMock = vi.fn();

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnections: () => useGetConnectionsMock(),
  useUpdateConnections: (...args: any[]) => useUpdateConnectionsMock(...args),
  useAutoConnectAll: (...args: any[]) => useAutoConnectAllMock(...args),
}));
vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useActiveConnectionQuery: () => useActiveConnectionQueryMock(),
}));
vi.mock("src/frontend/hooks/useShowHide", () => ({
  useShowHide: () => useShowHideMock(),
}));
vi.mock("src/common/adapters/DataScriptFactory", () => ({
  isDialectSupportManagedMetadata: (...args: any[]) => isDialectSupportManagedMetadataMock(...args),
}));
vi.mock("src/frontend/data/api", () => ({
  default: {
    getConnectionDatabases: (...args: any[]) => getConnectionDatabasesMock(...args),
    getConnectionTables: (...args: any[]) => getConnectionTablesMock(...args),
    getConnectionColumns: (...args: any[]) => getConnectionColumnsMock(...args),
  },
}));

import { useFlatTreeRows } from "src/frontend/components/VirtualizedConnectionTree/useFlatTreeRows";

function wrapper({ children }: any) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useShowHideMock.mockReturnValue({ visibles: {}, onToggle: vi.fn() });
  useActiveConnectionQueryMock.mockReturnValue({ query: undefined });
  useUpdateConnectionsMock.mockReturnValue({ mutateAsync: vi.fn() });
  useAutoConnectAllMock.mockReturnValue(undefined);
  isDialectSupportManagedMetadataMock.mockReturnValue(false);
  getConnectionDatabasesMock.mockResolvedValue([]);
  getConnectionTablesMock.mockResolvedValue([]);
  getConnectionColumnsMock.mockResolvedValue([]);
});

describe("useFlatTreeRows", () => {
  test("loading state when connections are loading", () => {
    useGetConnectionsMock.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    expect(result.current.rows).toEqual([]);
    expect(result.current.connectionsLoading).toBe(true);
  });

  test("no connections -> empty rows", () => {
    useGetConnectionsMock.mockReturnValue({ data: [], isLoading: false });
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    expect(result.current.rows).toEqual([]);
    expect(result.current.rowFingerprint).toBe("");
  });

  test("single collapsed online connection produces one header row", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    expect(result.current.rows.length).toBe(1);
    expect(result.current.rows[0].type).toBe("connection-header");
    expect(result.current.rows[0].key).toBe("conn-c1");
  });

  test("connection in loading status with expanded visibility shows 'Connecting to server...'", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "loading", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    expect(result.current.rows.length).toBeGreaterThanOrEqual(2);
    const loadingRow: any = result.current.rows.find((r) => r.type === "loading");
    expect(loadingRow?.message).toBe("Connecting to server...");
  });

  test("connection offline + expanded shows connection-retry row", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "offline", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    const retryRow: any = result.current.rows.find((r) => r.type === "connection-retry");
    expect(retryRow).toBeTruthy();
    expect(retryRow.connectionId).toBe("c1");
  });

  test("rowFingerprint changes when row keys change", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    expect(result.current.rowFingerprint).toBe("conn-c1");
  });

  test("connection is marked selected when activeQuery matches", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useActiveConnectionQueryMock.mockReturnValue({ query: { connectionId: "c1" } });
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    const row: any = result.current.rows[0];
    expect(row.isSelected).toBe(true);
  });

  test("expanded online connection with empty database list shows 'Not Available'", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
    getConnectionDatabasesMock.mockResolvedValue([]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const emptyRow: any = result.current.rows.find((r) => r.type === "empty");
      expect(emptyRow).toBeTruthy();
    });
  });

  test("expanded connection with database returns database-header row", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const dbHeader: any = result.current.rows.find((r) => r.type === "database-header");
      expect(dbHeader).toBeTruthy();
      expect(dbHeader.databaseName).toBe("db1");
    });
  });

  test("error from database fetch shows error row", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
    getConnectionDatabasesMock.mockRejectedValue(new Error("db fetch failed"));
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const errRow: any = result.current.rows.find((r) => r.type === "error");
      expect(errRow).toBeTruthy();
      expect(errRow.message).toContain("db fetch failed");
    });
  });

  test("expanded database with tables returns table-header row", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({
      visibles: { c1: true, "c1 > db1": true },
      onToggle: vi.fn(),
    });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    getConnectionTablesMock.mockResolvedValue([{ name: "tbl1" }]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const tblHeader: any = result.current.rows.find((r) => r.type === "table-header");
      expect(tblHeader).toBeTruthy();
      expect(tblHeader.tableName).toBe("tbl1");
    });
  });

  test("expanded database with empty tables shows 'Not Available' empty row at depth 2", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({
      visibles: { c1: true, "c1 > db1": true },
      onToggle: vi.fn(),
    });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    getConnectionTablesMock.mockResolvedValue([]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const emptyRow: any = result.current.rows.find((r) => r.type === "empty" && r.depth === 2);
      expect(emptyRow).toBeTruthy();
    });
  });

  test("expanded table with columns returns column-header rows", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({
      visibles: { c1: true, "c1 > db1": true, "c1 > db1 > tbl1": true },
      onToggle: vi.fn(),
    });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    getConnectionTablesMock.mockResolvedValue([{ name: "tbl1" }]);
    getConnectionColumnsMock.mockResolvedValue([{ name: "col1", type: "TEXT" }]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const colHeader: any = result.current.rows.find((r) => r.type === "column-header");
      expect(colHeader).toBeTruthy();
      expect(colHeader.column.name).toBe("col1");
    });
  });

  test("expanded column shows column-attributes row", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({
      visibles: {
        c1: true,
        "c1 > db1": true,
        "c1 > db1 > tbl1": true,
        "c1 > db1 > tbl1 > col1": true,
      },
      onToggle: vi.fn(),
    });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    getConnectionTablesMock.mockResolvedValue([{ name: "tbl1" }]);
    getConnectionColumnsMock.mockResolvedValue([{ name: "col1", type: "TEXT" }]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const colAttr: any = result.current.rows.find((r) => r.type === "column-attributes");
      expect(colAttr).toBeTruthy();
    });
  });

  test("table with > MAX_COLUMN_SIZE_TO_SHOW columns shows show-all-columns row", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({
      visibles: { c1: true, "c1 > db1": true, "c1 > db1 > tbl1": true },
      onToggle: vi.fn(),
    });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    getConnectionTablesMock.mockResolvedValue([{ name: "tbl1" }]);
    const manyColumns = Array.from({ length: 25 }, (_, i) => ({ name: `col${i}`, type: "TEXT" }));
    getConnectionColumnsMock.mockResolvedValue(manyColumns);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const showAll: any = result.current.rows.find((r) => r.type === "show-all-columns");
      expect(showAll).toBeTruthy();
    });
  });

  test("managed metadata dialect does not fetch columns - tables are leaf nodes", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "rest" }],
      isLoading: false,
    });
    isDialectSupportManagedMetadataMock.mockImplementation((dialect: string) => dialect === "rest");
    useShowHideMock.mockReturnValue({
      visibles: { c1: true, "c1 > db1": true, "c1 > db1 > tbl1": true },
      onToggle: vi.fn(),
    });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    getConnectionTablesMock.mockResolvedValue([{ name: "tbl1" }]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const tblHeader: any = result.current.rows.find((r) => r.type === "table-header");
      expect(tblHeader).toBeTruthy();
      expect(tblHeader.isExpanded).toBe(false);
    });
    expect(getConnectionColumnsMock).not.toHaveBeenCalled();
  });

  test("activeQuery on table marks table row as selected", async () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({
      visibles: { c1: true, "c1 > db1": true },
      onToggle: vi.fn(),
    });
    useActiveConnectionQueryMock.mockReturnValue({
      query: { connectionId: "c1", databaseId: "db1", tableId: "tbl1" },
    });
    getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
    getConnectionTablesMock.mockResolvedValue([{ name: "tbl1" }]);
    const { result } = renderHook(() => useFlatTreeRows(), { wrapper });
    await waitFor(() => {
      const tblHeader: any = result.current.rows.find((r) => r.type === "table-header");
      expect(tblHeader?.isSelected).toBe(true);
    });
  });

  // The rows build is memoized on a fingerprint derived from the query results. An earlier version of
  // that fingerprint encoded only `data.length`, so any metadata change that preserved the count —
  // every rename, every type change — left the tree rendering stale values.
  describe("refetched metadata of the same length", () => {
    /** Renders the hook against a caller-owned QueryClient so the test can force a refetch. */
    function renderWithClient() {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
      });
      const { result } = renderHook(() => useFlatTreeRows(), {
        wrapper: ({ children }: any) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
      });
      return { result, queryClient };
    }

    /**
     * Returns the first row of `type`, widened to `any` so tests can read fields that only exist on
     * one member of the `TreeRow` union.
     */
    function findRow(rows: readonly { type: string }[], type: string): any {
      return rows.find((r) => r.type === type);
    }

    test("a renamed database is reflected in the rows", async () => {
      useGetConnectionsMock.mockReturnValue({
        data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
        isLoading: false,
      });
      useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
      getConnectionDatabasesMock.mockResolvedValue([{ name: "sales" }]);

      const { result, queryClient } = renderWithClient();
      await waitFor(() => {
        expect(findRow(result.current.rows, "database-header")?.databaseName).toBe("sales");
      });

      getConnectionDatabasesMock.mockResolvedValue([{ name: "revenue" }]);
      await queryClient.invalidateQueries();

      await waitFor(() => {
        expect(findRow(result.current.rows, "database-header")?.databaseName).toBe("revenue");
      });
    });

    test("a renamed table is reflected in the rows", async () => {
      useGetConnectionsMock.mockReturnValue({
        data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
        isLoading: false,
      });
      useShowHideMock.mockReturnValue({ visibles: { c1: true, "c1 > db1": true }, onToggle: vi.fn() });
      getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
      getConnectionTablesMock.mockResolvedValue([{ name: "invoices" }]);

      const { result, queryClient } = renderWithClient();
      await waitFor(() => {
        expect(findRow(result.current.rows, "table-header")?.tableName).toBe("invoices");
      });

      getConnectionTablesMock.mockResolvedValue([{ name: "receipts" }]);
      await queryClient.invalidateQueries();

      await waitFor(() => {
        expect(findRow(result.current.rows, "table-header")?.tableName).toBe("receipts");
      });
    });

    test("a changed column type is reflected in the rows", async () => {
      useGetConnectionsMock.mockReturnValue({
        data: [{ id: "c1", name: "Conn1", status: "online", dialect: "sqlite" }],
        isLoading: false,
      });
      useShowHideMock.mockReturnValue({
        visibles: { c1: true, "c1 > db1": true, "c1 > db1 > tbl1": true },
        onToggle: vi.fn(),
      });
      getConnectionDatabasesMock.mockResolvedValue([{ name: "db1" }]);
      getConnectionTablesMock.mockResolvedValue([{ name: "tbl1" }]);
      getConnectionColumnsMock.mockResolvedValue([{ name: "amount", type: "TEXT" }]);

      const { result, queryClient } = renderWithClient();
      await waitFor(() => {
        expect(findRow(result.current.rows, "column-header")?.column.type).toBe("TEXT");
      });

      getConnectionColumnsMock.mockResolvedValue([{ name: "amount", type: "INTEGER" }]);
      await queryClient.invalidateQueries();

      await waitFor(() => {
        expect(findRow(result.current.rows, "column-header")?.column.type).toBe("INTEGER");
      });
    });
  });
});
