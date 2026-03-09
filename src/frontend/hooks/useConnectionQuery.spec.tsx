// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getQueries: vi.fn().mockResolvedValue([]),
    upsertQuery: vi.fn().mockResolvedValue({}),
    deleteQuery: vi.fn().mockResolvedValue("q1"),
  },
}));

vi.mock("src/frontend/data/config", () => ({
  SessionStorageConfig: {
    get: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  },
}));

vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useAddRecycleBinItem: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useIsSoftDeleteModeSetting: () => false,
}));

vi.mock("src/frontend/utils/commonUtils", () => ({
  getGeneratedRandomId: (prefix: string) => `${prefix}_test123`,
  getUpdatedOrdersForList: (list: any[], _from: number, _to: number) => list,
}));

import WrappedContext, { useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";

function Consumer() {
  const { queries, isLoading } = useConnectionQueries();
  return (
    <div>
      <span data-testid="loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="count">{queries?.length ?? 0}</span>
    </div>
  );
}

describe("useConnectionQuery", () => {
  test("WrappedContext renders children", () => {
    const { container } = render(
      <WrappedContext>
        <div>child content</div>
      </WrappedContext>,
    );
    expect(container.textContent).toContain("child content");
  });

  test("useConnectionQueries returns queries and handlers", () => {
    const { container } = render(
      <WrappedContext>
        <Consumer />
      </WrappedContext>,
    );
    expect(container.querySelector("[data-testid='count']")?.textContent).toContain("0");
  });
});
