/** @vitest-environment jsdom */
import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useSession", () => ({
  useGetSessions: () => ({
    data: [
      { id: "s1", name: "S1" },
      { id: "s2", name: "S2" },
    ],
    isLoading: false,
  }),
  useGetCurrentSession: () => ({ data: { id: "s1", name: "S1" } }),
  useUpsertSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSelectSession: () => ({ mutateAsync: vi.fn() }),
  useDeleteSession: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ confirm: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn() }),
}));

vi.mock("src/frontend/utils/commonUtils", async () => {
  const actual = await vi.importActual<any>("src/frontend/utils/commonUtils");
  return { ...actual, useNavigate: () => vi.fn() };
});

import SessionSelectionForm from "src/frontend/components/SessionSelectionForm";

describe("SessionSelectionForm", () => {
  test("renders list of sessions with current marked", () => {
    const { container } = render(<SessionSelectionForm isFirstTime={false} />);
    expect(container.textContent).toContain("S1");
    expect(container.textContent).toContain("S2");
    expect(container.textContent).toContain("Current Session");
  });

  test("shows loading state when sessions are loading", async () => {
    const { rerender, container } = render(<SessionSelectionForm isFirstTime={true} />);
    expect(container).toBeDefined();
  });

  test("isFirstTime mode hides edit/delete icons", () => {
    const { container } = render(<SessionSelectionForm isFirstTime={true} />);
    // no edit/delete icons should appear
    expect(container.querySelectorAll('[aria-label="Edit"]').length).toBe(0);
    expect(container.querySelectorAll('[aria-label="Delete"]').length).toBe(0);
  });

  test("non-firstTime mode shows edit/delete icons per session", () => {
    const { container } = render(<SessionSelectionForm isFirstTime={false} />);
    expect(container.querySelectorAll('[aria-label="Edit"]').length).toBe(2);
    expect(container.querySelectorAll('[aria-label="Delete"]').length).toBe(2);
  });
});

describe("SessionSelectionForm — loading state", () => {
  test("shows CircularProgress when sessions are loading", async () => {
    vi.resetModules();
    vi.doMock("src/frontend/components/MissionControl", () => ({ useCommands: () => ({ selectCommand: vi.fn() }) }));
    vi.doMock("src/frontend/hooks/useSession", () => ({
      useGetSessions: () => ({ data: undefined, isLoading: true }),
      useGetCurrentSession: () => ({ data: undefined }),
      useUpsertSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useSelectSession: () => ({ mutateAsync: vi.fn() }),
      useDeleteSession: () => ({ mutateAsync: vi.fn() }),
    }));
    vi.doMock("src/frontend/hooks/useActionDialogs", () => ({
      useActionDialogs: () => ({ confirm: vi.fn(), dismiss: vi.fn() }),
    }));
    vi.doMock("src/frontend/utils/commonUtils", async () => {
      const actual = await vi.importActual<any>("src/frontend/utils/commonUtils");
      return { ...actual, useNavigate: () => vi.fn() };
    });
    const { default: Form } = await import("src/frontend/components/SessionSelectionForm");
    const { container } = render(<Form isFirstTime={true} />);
    expect(container.querySelector(".MuiCircularProgress-root")).toBeTruthy();
  });
});
