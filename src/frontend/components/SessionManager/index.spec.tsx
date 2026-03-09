// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

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

describe("SessionManager", () => {
  test("renders children when session is valid", async () => {
    const { container } = render(
      <SessionManager>
        <div>App Content</div>
      </SessionManager>,
    );
    // Wait for useEffect to set status
    await vi.waitFor(() => {
      expect(container.textContent).toContain("App Content");
    });
  });
});
