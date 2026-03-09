// @vitest-environment jsdom
import { render } from "@testing-library/react";
import DropdownMenu from "src/frontend/components/DropdownMenu";

describe("DropdownMenu", () => {
  test("returns null when anchorEl ref is empty", () => {
    const anchorRef = { current: null };
    const { container } = render(
      <DropdownMenu id="test" options={[]} anchorEl={anchorRef as any} />,
    );
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  test("renders loading state when isLoading is true", () => {
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor };

    const { container } = render(
      <DropdownMenu id="test" options={[]} anchorEl={anchorRef} open={true} isLoading={true} />,
    );
    expect(container.textContent).toContain("Loading");
    document.body.removeChild(anchor);
  });

  test("renders 'No options.' when options is empty and not loading", () => {
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor };

    const { container } = render(
      <DropdownMenu id="test" options={[]} anchorEl={anchorRef} open={true} />,
    );
    expect(container.textContent).toContain("No options.");
    document.body.removeChild(anchor);
  });
});
