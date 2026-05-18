// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
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
});
