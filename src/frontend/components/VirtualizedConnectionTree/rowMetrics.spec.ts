import { describe, test, expect } from "vitest";
import {
  estimateTreeRowHeight,
  getTreeRowKey,
  ROW_HEIGHT_COLUMN_ATTRIBUTES,
  ROW_HEIGHT_COMPACT,
  ROW_HEIGHT_CONNECTION_SUBTITLE_COMPACT,
  ROW_HEIGHT_CONNECTION_SUBTITLE_DEFAULT,
  ROW_HEIGHT_DEFAULT,
} from "src/frontend/components/VirtualizedConnectionTree/rowMetrics";
import { TreeRow } from "src/frontend/components/VirtualizedConnectionTree/types";

/** Builds a connection-header row for a connection whose url renders as a subtitle. */
function connectionRow(id: string, connection = "sqlite://acme.db"): TreeRow {
  return {
    type: "connection-header",
    key: `conn-${id}`,
    depth: 0,
    visibilityKey: id,
    connection: { id, name: id, connection, dialect: "sqlite" } as any,
    connectionIndex: 0,
    isSelected: false,
    isExpanded: false,
  };
}

/** Builds a column-header row. */
function columnRow(key: string): TreeRow {
  return {
    type: "column-header",
    key,
    depth: 3,
    visibilityKey: key,
    connectionId: "c1",
    databaseId: "db1",
    tableId: "tbl1",
    column: { name: "amount", type: "INTEGER" } as any,
    isSelected: false,
    isExpanded: false,
  };
}

describe("getTreeRowKey", () => {
  test("returns the row's own key, not its index", () => {
    const rows = [connectionRow("c1"), columnRow("col-a"), columnRow("col-b")];
    expect(getTreeRowKey(rows, 0)).toBe("conn-c1");
    expect(getTreeRowKey(rows, 1)).toBe("col-a");
    expect(getTreeRowKey(rows, 2)).toBe("col-b");
  });

  // Regression: the virtualizer caches measured heights against this key. Keying by index made an
  // expand/collapse hand every shifted row its neighbour's cached height, so rows drew on top of
  // each other until a scroll re-measured them.
  test("a row keeps its key after rows are inserted above it", () => {
    const before = [connectionRow("c1"), columnRow("col-a")];
    const after = [connectionRow("c1"), columnRow("inserted-1"), columnRow("inserted-2"), columnRow("col-a")];

    expect(getTreeRowKey(before, 1)).toBe("col-a");
    expect(getTreeRowKey(after, 3)).toBe("col-a");
    expect(getTreeRowKey(after, 1)).not.toBe("col-a");
  });

  test("a row keeps its key after rows are removed above it", () => {
    const expanded = [connectionRow("c1"), columnRow("col-a"), columnRow("col-b"), columnRow("tail")];
    const collapsed = [connectionRow("c1"), columnRow("tail")];

    expect(getTreeRowKey(expanded, 3)).toBe("tail");
    expect(getTreeRowKey(collapsed, 1)).toBe("tail");
  });

  test("falls back to the index when the row is missing", () => {
    expect(getTreeRowKey([], 4)).toBe(4);
  });

  test("keys are unique across a mixed row list", () => {
    const rows = [connectionRow("c1"), connectionRow("c2"), columnRow("col-a"), columnRow("col-b")];
    const keys = rows.map((_row, index) => getTreeRowKey(rows, index));
    expect(new Set(keys).size).toBe(rows.length);
  });
});

describe("estimateTreeRowHeight", () => {
  test("uses the layout mode row height for a plain row", () => {
    const rows = [columnRow("col-a")];
    expect(estimateTreeRowHeight(rows, 0, false)).toBe(ROW_HEIGHT_DEFAULT);
    expect(estimateTreeRowHeight(rows, 0, true)).toBe(ROW_HEIGHT_COMPACT);
  });

  test("adds a subtitle line for a connection header that renders a url", () => {
    const rows = [connectionRow("c1")];
    expect(estimateTreeRowHeight(rows, 0, false)).toBe(ROW_HEIGHT_DEFAULT + ROW_HEIGHT_CONNECTION_SUBTITLE_DEFAULT);
    expect(estimateTreeRowHeight(rows, 0, true)).toBe(ROW_HEIGHT_COMPACT + ROW_HEIGHT_CONNECTION_SUBTITLE_COMPACT);
  });

  test("omits the subtitle line for a connection header with no url", () => {
    const rows = [connectionRow("c1", "")];
    expect(estimateTreeRowHeight(rows, 0, false)).toBe(ROW_HEIGHT_DEFAULT);
  });

  test("scales a column-attributes row with the number of attributes", () => {
    const rows: TreeRow[] = [
      {
        type: "column-attributes",
        key: "colattr-1",
        depth: 4,
        column: { name: "amount", type: "INTEGER", primaryKey: true } as any,
      },
    ];
    expect(estimateTreeRowHeight(rows, 0, false)).toBe(4 * ROW_HEIGHT_COLUMN_ATTRIBUTES);
  });

  test("falls back to the row height when the row is missing", () => {
    expect(estimateTreeRowHeight([], 7, false)).toBe(ROW_HEIGHT_DEFAULT);
    expect(estimateTreeRowHeight([], 7, true)).toBe(ROW_HEIGHT_COMPACT);
  });
});
