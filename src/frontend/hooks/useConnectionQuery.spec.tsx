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
  formatShortDate: () => "2024-01-01",
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

  test("onAddQuery creates a new tab and selects it", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true })]);

    function AddConsumer() {
      const didAddRef = useRef(false);
      const { queries, isLoading, onAddQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didAddRef.current) return;
        didAddRef.current = true;
        onAddQuery();
      }, [isLoading, onAddQuery]);
      return <span data-testid="add-count">{queries.length}</span>;
    }

    const { container } = render(
      <WrappedContext>
        <AddConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='add-count']")?.textContent).toBe("2"));
  });

  test("onAddQuery with payload uses provided name", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([]);
    function AddConsumer() {
      const didAddRef = useRef(false);
      const { queries, isLoading, onAddQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didAddRef.current) return;
        didAddRef.current = true;
        onAddQuery({ name: "MyQuery", sql: "select 1" });
      }, [isLoading, onAddQuery]);
      return <span data-testid="names">{queries.map((q) => q.name).join(",")}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <AddConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='names']")?.textContent).toContain("MyQuery"));
  });

  test("onDeleteQuery removes a query", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true }), makeQuery("q2")]);
    function DeleteConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onDeleteQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onDeleteQuery("q1");
      }, [isLoading, onDeleteQuery]);
      return <span data-testid="ids">{queries.map((q) => q.id).join(",")}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <DeleteConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='ids']")?.textContent).toBe("q2"));
  });

  test("onShowQuery changes selected query", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true }), makeQuery("q2"), makeQuery("q3")]);
    function ShowConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onShowQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onShowQuery("q3");
      }, [isLoading, onShowQuery]);
      return <span data-testid="selected">{queries.find((q) => q.selected)?.id ?? ""}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <ShowConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='selected']")?.textContent).toBe("q3"));
  });

  test("onChangeQuery updates query properties", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true })]);
    function ChangeConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onChangeQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onChangeQuery("q1", { sql: "updated sql" });
      }, [isLoading, onChangeQuery]);
      return <span data-testid="sql">{queries[0]?.sql ?? ""}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <ChangeConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='sql']")?.textContent).toBe("updated sql"));
  });

  test("onDuplicateQuery copies an existing tab", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true, name: "Original" })]);
    function DupeConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onDuplicateQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onDuplicateQuery("q1");
      }, [isLoading, onDuplicateQuery]);
      return <span data-testid="count">{queries.length}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <DupeConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='count']")?.textContent).toBe("2"));
  });

  test("onDuplicateQuery does nothing if id not found", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true })]);
    function DupeConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onDuplicateQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onDuplicateQuery("nonexistent");
      }, [isLoading, onDuplicateQuery]);
      return <span data-testid="count">{queries.length}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <DupeConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='count']")?.textContent).toBe("1"));
  });

  test("onSaveQueries persists all tabs when no IDs provided", async () => {
    mockSettings.isQueryTabAutoSaveEnabled = false;
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true }), makeQuery("q2")]);
    function SaveConsumer() {
      const didRef = useRef(false);
      const { isLoading, onSaveQueries } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onSaveQueries();
      }, [isLoading, onSaveQueries]);
      return <span>save consumer</span>;
    }
    render(
      <WrappedContext>
        <SaveConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(dataApi.upsertQuery).toHaveBeenCalledTimes(2));
  });

  test("onSaveQuery returns 0 when queryId is empty", async () => {
    let capturedResult: number | undefined;
    function SaveConsumer() {
      const didRef = useRef(false);
      const { isLoading, onSaveQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onSaveQuery().then((r) => {
          capturedResult = r;
        });
      }, [isLoading, onSaveQuery]);
      return <span>x</span>;
    }
    render(
      <WrappedContext>
        <SaveConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(capturedResult).toBe(0));
  });

  test("onDeleteQueries with empty array is a no-op", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([makeQuery("q1", { selected: true })]);
    function DelConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onDeleteQueries } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onDeleteQueries([]);
      }, [isLoading, onDeleteQueries]);
      return <span data-testid="count">{queries.length}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <DelConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='count']")?.textContent).toBe("1"));
  });

  test("onImportQuery strips timestamps", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([]);
    function ImportConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onImportQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onImportQuery({ id: "qi", name: "Imported", sql: "x", createdAt: 100, updatedAt: 200 } as any);
      }, [isLoading, onImportQuery]);
      return <span data-testid="names">{queries.map((q) => q.name).join(",")}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <ImportConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='names']")?.textContent).toContain("Imported"));
  });

  test("onImportQuery with undefined is a no-op", async () => {
    vi.mocked(SessionStorageConfig.get).mockReturnValue([]);
    function ImportConsumer() {
      const didRef = useRef(false);
      const { queries, isLoading, onImportQuery } = useConnectionQueries();
      useEffect(() => {
        if (isLoading || didRef.current) return;
        didRef.current = true;
        onImportQuery(undefined);
      }, [isLoading, onImportQuery]);
      return <span data-testid="count">{queries.length}</span>;
    }
    const { container } = render(
      <WrappedContext>
        <ImportConsumer />
      </WrappedContext>,
    );
    await waitFor(() => expect(container.querySelector("[data-testid='count']")?.textContent).toBe("0"));
  });
});
