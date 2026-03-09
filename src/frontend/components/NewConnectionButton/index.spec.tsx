// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));

import NewConnectionButton from "src/frontend/components/NewConnectionButton";

describe("NewConnectionButton", () => {
  test("renders the Connection label", () => {
    const { container } = render(<NewConnectionButton />);
    expect(container.textContent).toContain("Connection");
  });

  test("renders a button group", () => {
    const { container } = render(<NewConnectionButton />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
