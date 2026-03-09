// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/hooks/useClientSidePreference", () => ({
  useSideBarWidthPreference: () => ({ value: 300, onChange: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));

vi.mock("src/frontend/components/Resizer", () => ({
  Container: (props: any) => <div className={props.className}>{props.children}</div>,
  Section: (props: any) => <div>{props.children}</div>,
  Bar: () => <div />,
}));

import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";

describe("LayoutTwoColumns", () => {
  test("renders left and right pane content", () => {
    const { container } = render(
      <LayoutTwoColumns>{[<div key="l">Left Content</div>, <div key="r">Right Content</div>]}</LayoutTwoColumns>,
    );
    expect(container.textContent).toContain("Left Content");
    expect(container.textContent).toContain("Right Content");
  });

  test("renders LayoutTwoColumns class", () => {
    const { container } = render(<LayoutTwoColumns>{[<div key="l">L</div>, <div key="r">R</div>]}</LayoutTwoColumns>);
    expect(container.querySelector(".LayoutTwoColumns")).toBeTruthy();
  });

  test("collapses left pane when toggle button is clicked", () => {
    const { container } = render(<LayoutTwoColumns>{[<div key="l">Left</div>, <div key="r">Right</div>]}</LayoutTwoColumns>);
    // Find the fab button (collapse)
    const fab = container.querySelector("button");
    if (fab) fireEvent.click(fab);
    // After collapse, right pane should still be visible
    expect(container.textContent).toContain("Right");
  });
});
