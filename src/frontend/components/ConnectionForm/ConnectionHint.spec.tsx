// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useGetBookmarkItems: () => ({ data: [], isLoading: false }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useLayoutModeSetting: () => "compact",
}));

import ConnectionHint from "src/frontend/components/ConnectionForm/ConnectionHint";

describe("ConnectionHint", () => {
  test("renders supported dialect names", () => {
    const { container } = render(<ConnectionHint onChange={() => {}} />);
    expect(container.textContent).toContain("MySQL");
  });

  test("renders list items for each dialect", () => {
    const { container } = render(<ConnectionHint onChange={() => {}} />);
    const listItems = container.querySelectorAll("li");
    expect(listItems.length).toBeGreaterThan(0);
  });

  test("calls onChange when a dialect is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(<ConnectionHint onChange={onChange} />);
    const firstLink = container.querySelector("a, [role='button'], .MuiLink-root") as HTMLElement;
    if (firstLink) {
      fireEvent.click(firstLink);
      expect(onChange).toHaveBeenCalled();
    }
  });
});
