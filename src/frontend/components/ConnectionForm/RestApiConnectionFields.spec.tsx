// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";
import RestApiConnectionFields from "src/frontend/components/ConnectionForm/RestApiConnectionFields";

describe("RestApiConnectionFields", () => {
  test("renders empty state when no variables in config", () => {
    const setConnection = vi.fn();
    const { container } = render(<RestApiConnectionFields connection={`rest://{}`} setConnection={setConnection} />);
    expect(container.textContent).toContain("No variables defined");
  });

  test("renders existing host + variables from connection string", () => {
    const setConnection = vi.fn();
    const conn = `rest://${JSON.stringify({ HOST: "https://api.acme.test", variables: [{ key: "TOKEN", value: "abc", enabled: true }] })}`;
    const { container } = render(<RestApiConnectionFields connection={conn} setConnection={setConnection} />);
    // table renders with one row, the host input has the value
    expect(container.querySelector("input[value='https://api.acme.test']")).toBeTruthy();
    expect(container.textContent).not.toContain("No variables defined");
  });

  test("clicking Add Variable produces a new row + calls setConnection with serialized config", () => {
    const setConnection = vi.fn();
    const { container, getByText } = render(<RestApiConnectionFields connection={`rest://{}`} setConnection={setConnection} />);
    fireEvent.click(getByText("Add Variable"));
    expect(setConnection).toHaveBeenCalled();
    const lastCall = setConnection.mock.calls[setConnection.mock.calls.length - 1][0];
    expect(lastCall).toMatch(/^rest:\/\//);
    expect(JSON.parse(lastCall.slice("rest://".length)).variables.length).toBe(1);
    // table now visible (no empty-state text)
    expect(container.textContent).not.toContain("No variables defined");
  });

  test("invalid JSON in connection string falls back to empty config", () => {
    const setConnection = vi.fn();
    const { container } = render(<RestApiConnectionFields connection={`rest://garbage{`} setConnection={setConnection} />);
    expect(container.textContent).toContain("No variables defined");
  });

  test("legacy restapi:// prefix is handled", () => {
    const setConnection = vi.fn();
    const conn = `restapi://${JSON.stringify({ HOST: "https://x" })}`;
    const { container } = render(<RestApiConnectionFields connection={conn} setConnection={setConnection} />);
    expect(container.querySelector("input[value='https://x']")).toBeTruthy();
  });

  test("changing HOST updates connection string", () => {
    const setConnection = vi.fn();
    const { container } = render(<RestApiConnectionFields connection={`rest://{}`} setConnection={setConnection} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "https://new.example.com" } });
    expect(setConnection).toHaveBeenCalled();
    const last = setConnection.mock.calls[setConnection.mock.calls.length - 1][0];
    expect(JSON.parse(last.slice("rest://".length)).HOST).toBe("https://new.example.com");
  });
});
