// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("src/frontend/components/SessionSelectionModal", () => ({
  default: () => <div>SessionModal</div>,
}));

vi.mock("src/frontend/data/session", () => ({
  setCurrentSessionId: vi.fn(),
}));

vi.mock("src/frontend/hooks/useSession", () => ({
  useGetCurrentSession: () => ({ data: { id: "s1", name: "Test" }, isLoading: false, refetch: vi.fn() }),
  useSelectSession: () => ({ mutateAsync: vi.fn() }),
}));

import SessionManager from "src/frontend/components/SessionManager";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("SessionManager", () => {
  test("renders children when session is valid", async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SessionManager>
          <div>App Content</div>
        </SessionManager>
      </QueryClientProvider>,
    );
    // Wait for useEffect to set status
    await vi.waitFor(() => {
      expect(container.textContent).toContain("App Content");
    });
  });
});
