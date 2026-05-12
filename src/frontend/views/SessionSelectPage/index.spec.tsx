// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/components/SessionSelectionForm", () => ({
  default: () => <div data-testid="session-select-form" />,
}));

import SessionSelectPage from "src/frontend/views/SessionSelectPage";

describe("SessionSelectPage", () => {
  test("renders the welcome alert + selection form", () => {
    const { container, getByTestId } = render(<SessionSelectPage />);
    expect(container.textContent).toContain("Welcome to SQLUI Native");
    expect(getByTestId("session-select-form")).toBeTruthy();
  });
});
