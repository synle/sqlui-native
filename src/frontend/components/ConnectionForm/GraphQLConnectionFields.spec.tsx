// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";
import GraphQLConnectionFields from "src/frontend/components/ConnectionForm/GraphQLConnectionFields";

describe("GraphQLConnectionFields", () => {
  test("empty config renders empty-state messages", () => {
    const setConnection = vi.fn();
    const { container } = render(<GraphQLConnectionFields connection={`graphql://{}`} setConnection={setConnection} />);
    expect(container.textContent).toContain("No variables defined");
    expect(container.textContent).toContain("No default headers");
  });

  test("invalid JSON falls back to empty state", () => {
    const setConnection = vi.fn();
    const { container } = render(<GraphQLConnectionFields connection={`graphql://garbage{`} setConnection={setConnection} />);
    expect(container.textContent).toContain("No variables defined");
  });

  test("renders ENDPOINT input + variable rows from existing config", () => {
    const setConnection = vi.fn();
    const conn = `graphql://${JSON.stringify({
      ENDPOINT: "https://api.acme.test/graphql",
      headers: { Authorization: "Bearer x" },
      variables: [{ key: "TOK", value: "secret", enabled: true }],
    })}`;
    const { container } = render(<GraphQLConnectionFields connection={conn} setConnection={setConnection} />);
    expect(container.querySelector("input[value='https://api.acme.test/graphql']")).toBeTruthy();
    expect(container.textContent).not.toContain("No variables defined");
    expect(container.textContent).not.toContain("No default headers");
  });

  test("clicking Add Variable adds a row + invokes setConnection", () => {
    const setConnection = vi.fn();
    const { getByText } = render(<GraphQLConnectionFields connection={`graphql://{}`} setConnection={setConnection} />);
    fireEvent.click(getByText("Add Variable"));
    expect(setConnection).toHaveBeenCalled();
    const last = setConnection.mock.calls.at(-1)?.[0];
    expect(last).toMatch(/^graphql:\/\//);
    expect(JSON.parse(last.slice("graphql://".length)).variables.length).toBe(1);
  });

  test("clicking Add Header adds a header row + invokes setConnection", () => {
    const setConnection = vi.fn();
    const { getByText } = render(<GraphQLConnectionFields connection={`graphql://{}`} setConnection={setConnection} />);
    fireEvent.click(getByText("Add Header"));
    expect(setConnection).toHaveBeenCalled();
  });

  test("changing ENDPOINT updates connection string", () => {
    const setConnection = vi.fn();
    const { container } = render(<GraphQLConnectionFields connection={`graphql://{}`} setConnection={setConnection} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "https://x/graphql" } });
    expect(setConnection).toHaveBeenCalled();
    const last = setConnection.mock.calls.at(-1)?.[0];
    expect(JSON.parse(last.slice("graphql://".length)).ENDPOINT).toBe("https://x/graphql");
  });
});
