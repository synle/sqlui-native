// @vitest-environment jsdom
import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const searchSchemaMock = vi.fn();
vi.mock("src/frontend/data/api", () => ({
  ProxyApi: {
    searchSchema: (...args: any[]) => searchSchemaMock(...args),
  },
}));

import SchemaSearchModal from "src/frontend/components/SchemaSearchModal";

beforeEach(() => {
  searchSchemaMock.mockReset().mockResolvedValue([]);
});

describe("SchemaSearchModal", () => {
  const onNavigate = vi.fn();

  test("renders without crashing", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    expect(container).toBeTruthy();
  });

  test("renders search input", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
    expect(input?.getAttribute("placeholder")).toContain("Search");
  });

  test("renders view mode toggle buttons", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button");
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain("Simple");
    expect(buttonTexts).toContain("Detailed");
  });

  test("shows info alert when no search has been performed", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const alert = container.querySelector(".MuiAlert-root");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Search across all cached schema metadata");
  });

  test("typing in search input triggers debounced API call", async () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "email" } });
    await waitFor(() => expect(searchSchemaMock).toHaveBeenCalledWith("email"), { timeout: 1000 });
  });

  test("displays 'No results found' alert when search returns empty", async () => {
    searchSchemaMock.mockResolvedValueOnce([]);
    const { container, findByText } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "missing" } });
    await waitFor(() => expect(container.textContent).toContain("No results found"), {
      timeout: 2000,
    });
  });

  test("displays results when API returns matches", async () => {
    searchSchemaMock.mockResolvedValue([
      {
        connectionId: "c1",
        connectionName: "MyDB",
        connectionString: "mysql://user:pwd@host/db",
        databaseId: "d1",
        tableId: "t1",
        column: { name: "email", type: "varchar", allowNull: false, primaryKey: false },
      },
      {
        connectionId: "c1",
        connectionName: "MyDB",
        connectionString: "mysql://user:pwd@host/db",
        databaseId: "d1",
        tableId: "t1",
        column: { name: "user_id", type: "int", primaryKey: true },
      },
    ]);
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "email" } });
    await waitFor(() => expect(container.textContent).toContain("results"), { timeout: 2000 });
  });

  test("handles API error gracefully", async () => {
    searchSchemaMock.mockRejectedValueOnce(new Error("api"));
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "err" } });
    await waitFor(() => expect(container.textContent).toContain("No results found"), {
      timeout: 2000,
    });
  });

  test("switching to detailed view mode works", () => {
    const { container, getByText } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const detailedBtn = getByText("Detailed");
    fireEvent.click(detailedBtn);
    expect(detailedBtn).toBeTruthy();
  });

  test("empty search query does not invoke API", async () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    await new Promise((r) => setTimeout(r, 500));
    expect(searchSchemaMock).not.toHaveBeenCalled();
  });

  test("results include PK badge for primary keys", async () => {
    searchSchemaMock.mockResolvedValue([
      {
        connectionId: "c1",
        connectionName: "MyDB",
        connectionString: "mysql://host/db",
        databaseId: "d1",
        tableId: "t1",
        column: { name: "id", type: "int", primaryKey: true },
      },
    ]);
    const { container, getByText } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    // switch to detailed mode to render badges
    fireEvent.click(getByText("Detailed"));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "id" } });
    await waitFor(() => expect(container.textContent).toContain("PK"), { timeout: 2000 });
  });

  test("results include FK badge for foreign keys", async () => {
    searchSchemaMock.mockResolvedValue([
      {
        connectionId: "c1",
        connectionName: "MyDB",
        connectionString: "mysql://host/db",
        databaseId: "d1",
        tableId: "orders",
        column: {
          name: "user_id",
          type: "int",
          kind: "foreign_key",
          referencedTableName: "users",
          referencedColumnName: "id",
        },
      },
    ]);
    const { container, getByText } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    fireEvent.click(getByText("Detailed"));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "user_id" } });
    await waitFor(() => expect(container.textContent).toContain("FK"), { timeout: 2000 });
  });
});
