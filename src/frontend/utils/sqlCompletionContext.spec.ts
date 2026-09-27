import { describe, test, expect } from "vitest";
import { getContextualCompletions, parseTableAliases } from "src/frontend/utils/sqlCompletionContext";
import { CompletionItem } from "src/frontend/components/CodeEditorBox";

const ITEMS: CompletionItem[] = [
  { label: "acme", kind: "database" },
  { label: "customers", kind: "table" },
  { label: "orders", kind: "table" },
  { label: "id", kind: "column" },
  { label: "customers.id", kind: "column" },
];

const COLUMNS = {
  Customers: [{ name: "id", type: "int" }, { name: "name", type: "text" }],
  orders: [{ name: "id" }, { name: "customer_id" }, { name: "total" }],
};

const labels = (items: CompletionItem[]) => items.map((item) => item.label);

describe("parseTableAliases", () => {
  test("maps aliases with and without AS, plus bare table names", () => {
    const aliases = parseTableAliases("SELECT * FROM customers c JOIN acme.orders AS o ON o.customer_id = c.id");
    expect(Object.fromEntries(aliases)).toEqual({ customers: "customers", c: "customers", orders: "orders", o: "orders" });
  });

  test("does not treat a following keyword as an alias", () => {
    expect(Object.fromEntries(parseTableAliases("SELECT * FROM orders WHERE id = 1"))).toEqual({ orders: "orders" });
  });

  test("strips identifier quoting", () => {
    expect(parseTableAliases('SELECT * FROM "Orders" x').get("x")).toBe("orders");
    expect(parseTableAliases("SELECT * FROM `orders` x").get("x")).toBe("orders");
    expect(parseTableAliases("SELECT * FROM [dbo].[orders] x").get("x")).toBe("orders");
  });
});

describe("getContextualCompletions", () => {
  test("alias. suggests the aliased table's columns, even when the alias is declared after the cursor", () => {
    const sql = "SELECT o. FROM orders o";
    const result = getContextualCompletions("SELECT o.", sql, ITEMS, COLUMNS);
    expect(labels(result)).toEqual(["id", "customer_id", "total"]);
  });

  test("table. resolves table names case-insensitively", () => {
    const result = getContextualCompletions("SELECT customers.na", "SELECT customers.na FROM customers", ITEMS, COLUMNS);
    expect(labels(result)).toEqual(["id", "name"]);
    expect(result[1].detail).toBe("Column (customers - text)");
  });

  test("database. suggests tables", () => {
    const result = getContextualCompletions("SELECT * FROM acme.", "SELECT * FROM acme.", ITEMS, COLUMNS);
    expect(labels(result)).toEqual(["customers", "orders"]);
  });

  test("unknown qualifier falls back to the full list", () => {
    expect(getContextualCompletions("SELECT zz.", "SELECT zz.", ITEMS, COLUMNS)).toBe(ITEMS);
  });

  test.each(["SELECT * FROM ", "SELECT * FROM cu", "select * from orders o join ", "INSERT INTO ", "UPDATE "])(
    "after a table keyword (%s) suggests only databases and tables",
    (before) => {
      expect(labels(getContextualCompletions(before, before, ITEMS, COLUMNS))).toEqual(["acme", "customers", "orders"]);
    },
  );

  test("anywhere else returns the full list unchanged", () => {
    expect(getContextualCompletions("SELECT ", "SELECT ", ITEMS, COLUMNS)).toBe(ITEMS);
    expect(getContextualCompletions("SELECT * FROM orders WHERE ", "", ITEMS, COLUMNS)).toBe(ITEMS);
    expect(getContextualCompletions("", "", ITEMS)).toBe(ITEMS);
  });
});
