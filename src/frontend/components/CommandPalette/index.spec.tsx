// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const useActiveConnectionQueryMock = vi.fn();
const useConnectionQueriesMock = vi.fn();
const useGetConnectionByIdMock = vi.fn();
const useGetConnectionsMock = vi.fn();

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => useGetConnectionByIdMock(),
  useGetConnections: () => useGetConnectionsMock(),
}));

vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useActiveConnectionQuery: () => useActiveConnectionQueryMock(),
  useConnectionQueries: () => useConnectionQueriesMock(),
}));

import CommandPalette from "src/frontend/components/CommandPalette";

beforeEach(() => {
  useActiveConnectionQueryMock.mockReturnValue({
    query: { id: "q1", connectionId: "c1", name: "ActiveQ" },
  });
  useConnectionQueriesMock.mockReturnValue({
    queries: [
      { id: "q1", name: "ActiveQ" },
      { id: "q2", name: "OtherQ" },
    ],
  });
  useGetConnectionByIdMock.mockReturnValue({ data: { id: "c1", name: "ActiveConn" } });
  useGetConnectionsMock.mockReturnValue({
    data: [
      { id: "c1", name: "ActiveConn" },
      { id: "c2", name: "OtherConn" },
    ],
  });
});

describe("CommandPalette", () => {
  test("renders text input and command list", () => {
    const onSelect = vi.fn();
    const { container } = render(<CommandPalette onSelectCommand={onSelect} />);
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
    expect(input?.getAttribute("placeholder")).toContain("Type a command");
    expect(container.querySelectorAll(".CommandPalette__Option").length).toBeGreaterThan(0);
  });

  test("typing filters options via fuzzy match", () => {
    const onSelect = vi.fn();
    const { container } = render(<CommandPalette onSelectCommand={onSelect} />);
    const input = container.querySelector("input")!;
    fireEvent.change(input, { target: { value: "Settings" } });
    const options = container.querySelectorAll(".CommandPalette__Option");
    expect(options.length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Settings");
  });

  test("clicking an option invokes onSelectCommand", () => {
    const onSelect = vi.fn();
    const { container } = render(<CommandPalette onSelectCommand={onSelect} />);
    const opts = container.querySelectorAll(".CommandPalette__Option");
    fireEvent.click(opts[0]);
    expect(onSelect).toHaveBeenCalled();
    expect(onSelect.mock.calls[0][0]).toHaveProperty("event");
  });

  test("ArrowDown moves focus to next option", () => {
    const onSelect = vi.fn();
    const { container } = render(<CommandPalette onSelectCommand={onSelect} />);
    const section = container.querySelector("section")!;
    fireEvent.keyDown(section, { key: "ArrowDown" });
    expect(document.activeElement?.classList.contains("CommandPalette__Option")).toBe(true);
  });

  test("ArrowUp clamps at first option", () => {
    const onSelect = vi.fn();
    const { container } = render(<CommandPalette onSelectCommand={onSelect} />);
    const section = container.querySelector("section")!;
    fireEvent.keyDown(section, { key: "ArrowUp" });
    expect(document.activeElement?.classList.contains("CommandPalette__Option")).toBe(true);
  });

  test("empty queries/connections still renders core options", () => {
    useConnectionQueriesMock.mockReturnValue({ queries: [] });
    useGetConnectionsMock.mockReturnValue({ data: [] });
    useActiveConnectionQueryMock.mockReturnValue({ query: undefined });
    useGetConnectionByIdMock.mockReturnValue({ data: undefined });
    const onSelect = vi.fn();
    const { container } = render(<CommandPalette onSelectCommand={onSelect} />);
    expect(container.querySelectorAll(".CommandPalette__Option").length).toBeGreaterThan(0);
  });
});
