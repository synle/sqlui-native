// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getQueryVersionHistory: vi.fn().mockResolvedValue([]),
    addQueryVersionHistory: vi.fn().mockResolvedValue({ id: "v1" }),
    deleteQueryVersionHistory: vi.fn().mockResolvedValue(undefined),
    clearQueryVersionHistory: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  DEBOUNCE_MS,
  DELTA_THRESHOLD,
  MIN_TRACKING_LENGTH,
  normalizeSql,
  useAddQueryVersionHistory,
  useClearQueryVersionHistory,
  useDeleteQueryVersionHistory,
  useGetQueryVersionHistory,
} from "src/frontend/hooks/useQueryVersionHistory";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useQueryVersionHistory", () => {
  describe("normalizeSql", () => {
    test("trims leading and trailing whitespace", () => {
      expect(normalizeSql("   select 1   ")).toBe("select 1");
    });

    test("collapses internal whitespace runs to a single space", () => {
      expect(normalizeSql("select    *  from   t")).toBe("select * from t");
    });

    test("collapses tabs and newlines to a single space", () => {
      expect(normalizeSql("select\n\t*\nfrom\tt")).toBe("select * from t");
    });

    test("returns empty string for whitespace-only input", () => {
      expect(normalizeSql("   \n\t  ")).toBe("");
    });

    test("returns empty string for empty input", () => {
      expect(normalizeSql("")).toBe("");
    });

    test("is idempotent — running it twice yields the same result", () => {
      const once = normalizeSql("  select   1\nfrom\tt  ");
      const twice = normalizeSql(once);
      expect(twice).toBe(once);
    });
  });

  describe("tracking constants", () => {
    test("MIN_TRACKING_LENGTH is a positive integer", () => {
      expect(Number.isInteger(MIN_TRACKING_LENGTH)).toBe(true);
      expect(MIN_TRACKING_LENGTH).toBeGreaterThan(0);
    });

    test("DELTA_THRESHOLD is a positive integer smaller than MIN_TRACKING_LENGTH", () => {
      expect(Number.isInteger(DELTA_THRESHOLD)).toBe(true);
      expect(DELTA_THRESHOLD).toBeGreaterThan(0);
      expect(DELTA_THRESHOLD).toBeLessThan(MIN_TRACKING_LENGTH);
    });

    test("DEBOUNCE_MS is a positive integer", () => {
      expect(Number.isInteger(DEBOUNCE_MS)).toBe(true);
      expect(DEBOUNCE_MS).toBeGreaterThan(0);
    });
  });

  describe("hooks", () => {
    test("useGetQueryVersionHistory resolves with data", async () => {
      const { result } = renderHook(() => useGetQueryVersionHistory(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.data).toEqual([]);
    });

    test("useAddQueryVersionHistory exposes mutateAsync", () => {
      const { result } = renderHook(() => useAddQueryVersionHistory(), {
        wrapper: createWrapper(),
      });
      expect(result.current.mutateAsync).toBeDefined();
    });

    test("useDeleteQueryVersionHistory exposes mutateAsync", () => {
      const { result } = renderHook(() => useDeleteQueryVersionHistory(), {
        wrapper: createWrapper(),
      });
      expect(result.current.mutateAsync).toBeDefined();
    });

    test("useClearQueryVersionHistory exposes mutateAsync", () => {
      const { result } = renderHook(() => useClearQueryVersionHistory(), {
        wrapper: createWrapper(),
      });
      expect(result.current.mutateAsync).toBeDefined();
    });
  });
});
