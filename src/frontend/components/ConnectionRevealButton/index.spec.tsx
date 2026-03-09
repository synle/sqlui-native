// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));

import ConnectionRevealButton from "src/frontend/components/QueryBox/ConnectionRevealButton";

describe("ConnectionRevealButton", () => {
  test("renders the Reveal button", () => {
    const query = { connectionId: "c1", databaseId: "db1" } as any;
    const { container } = render(<ConnectionRevealButton query={query} />);
    expect(container.textContent).toContain("Reveal");
  });

  test("returns null when query is falsy", () => {
    const { container } = render(<ConnectionRevealButton query={null as any} />);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  test("disables the button when connectionId and databaseId are empty", () => {
    const query = { connectionId: "", databaseId: "" } as any;
    const { container } = render(<ConnectionRevealButton query={query} />);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.disabled).toBeTruthy();
  });
});
