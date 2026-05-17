// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import React, { useEffect, useRef } from "react";
import { SqluiFrontend } from "typings";

const mockSettings = vi.hoisted(() => ({
  isQueryTabAutoSaveEnabled: true,
}));

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
  useIsQueryTabAutoSaveEnabled: () => mockSettings.isQueryTabAutoSaveEnabled,
  useIsSoftDeleteModeSetting: () => false,
}));

vi.mock("src/frontend/utils/commonUtils", () => ({
  getGeneratedRandomId: (prefix: string) => `${prefix}_test123`,
  getUpdatedOrdersForList: (items: any[], from: number, to: number) => {
    if (from === to) {
      return items;
    }

    const targetItem = items[from];
    const toBeDeletedListItem = Symbol("to_be_deleted_list_item");
    items[from] = toBeDeletedListItem;
    items.splice(from > to ? to : to + 1, 0, targetItem);

    return items.filter((item) => item !== toBeDeletedListItem);
  },
}));

import WrappedContext, { useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import dataApi from "src/frontend/data/api";
import { SessionStorageConfig } from "src/frontend/data/config";

function makeQuery(id: string, overrides: Partial<SqluiFrontend.ConnectionQuery> = {}): SqluiFrontend.ConnectionQuery {
  return {
    id,
    name: id,
    sql: `select '${id}'`,
    ...overrides,
  };
}

function Consumer() {
  const { queries, isLoading } = useConnectionQueries();
  return (
    <div>
      <span data-testid="loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="count">{queries?.length ?? 0}</span>
      <span data-testid="selected">{queries?.find((query) => query.selected)?.id ?? ""}</span>
    </div>
  );
}

function ReorderConsumer(props: { from: number; to: number }) {
  const didReorderRef = useRef(false);
  const { queries, isLoading, onChangeTabOrdering } = useConnectionQueries();

  useEffect(() => {
    if (isLoading || didReorderRef.current) {
      return;
    }

    didReorderRef.current = true;
    onChangeTabOrdering(props.from, props.to);
  }, [isLoading, onChangeTabOrdering, props.from, props.to]);

  return <span data-testid="order">{queries.map((query) => query.id).join(",")}</span>;
}

describe("useConnectionQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.isQueryTabAutoSaveEnabled = true;
    vi.mocked(SessionStorageConfig.get).mockReturnValue([]);
  });

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

  test("restores the newest selected query tab", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([
      makeQuery("q1", { selected: true, updatedAt: 0 }),
      makeQuery("q2", { selected: false, updatedAt: 10 }),
      makeQuery("q3", { selected: true, updatedAt: 20 }),
    ]);

    const { container } = render(
      <WrappedContext>
        <Consumer />
      </WrappedContext>,
    );

    await waitFor(() => expect(container.querySelector("[data-testid='selected']")?.textContent).toContain("q3"));
  });

  test("auto-saves only reordered query tabs when tab ordering changes", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([
      makeQuery("q1", { selected: true }),
      makeQuery("q2"),
      makeQuery("q3"),
      makeQuery("q4"),
    ]);

    const { container } = render(
      <WrappedContext>
        <ReorderConsumer from={0} to={2} />
      </WrappedContext>,
    );

    await waitFor(() => expect(container.querySelector("[data-testid='order']")?.textContent).toContain("q2,q3,q1,q4"));
    await waitFor(() => expect(dataApi.upsertQuery).toHaveBeenCalledTimes(3));

    expect(vi.mocked(dataApi.upsertQuery).mock.calls.map(([query]) => [query.id, query.tabOrder])).toEqual([
      ["q2", 0],
      ["q3", 1],
      ["q1", 2],
    ]);
  });

  test("does not auto-save reordered query tabs when manual persistence is enabled", async () => {
    mockSettings.isQueryTabAutoSaveEnabled = false;
    vi.mocked(SessionStorageConfig.get).mockReturnValue([
      makeQuery("q1", { selected: true }),
      makeQuery("q2"),
      makeQuery("q3"),
      makeQuery("q4"),
    ]);

    const { container } = render(
      <WrappedContext>
        <ReorderConsumer from={0} to={2} />
      </WrappedContext>,
    );

    await waitFor(() => expect(container.querySelector("[data-testid='order']")?.textContent).toContain("q2,q3,q1,q4"));

    expect(dataApi.upsertQuery).not.toHaveBeenCalled();
  });
});
