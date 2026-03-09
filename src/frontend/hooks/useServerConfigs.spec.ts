// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getConfigs: vi.fn().mockResolvedValue({ darkMode: "light" }),
    updateConfigs: vi.fn().mockResolvedValue({}),
  },
}));

import { useGetServerConfigs, useUpdateServerConfigs } from "src/frontend/hooks/useServerConfigs";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useServerConfigs", () => {
  test("useGetServerConfigs returns data property", async () => {
    const { result } = renderHook(() => useGetServerConfigs(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useUpdateServerConfigs returns mutate function", () => {
    const { result } = renderHook(() => useUpdateServerConfigs(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});
