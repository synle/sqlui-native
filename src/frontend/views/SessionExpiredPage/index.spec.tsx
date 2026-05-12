// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/components/SessionSelectionForm", () => ({
  default: () => <div data-testid="session-select-form" />,
}));

import SessionExpiredPage from "src/frontend/views/SessionExpiredPage";

describe("SessionExpiredPage", () => {
  test("renders the warning alert + selection form", () => {
    const { container, getByTestId } = render(<SessionExpiredPage />);
    expect(container.textContent).toContain("Your session has been deleted");
    expect(getByTestId("session-select-form")).toBeTruthy();
  });
});
