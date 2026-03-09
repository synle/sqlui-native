// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import MyTabs from "src/frontend/components/Tabs";

vi.mock("src/frontend/hooks/useSetting", () => ({
  useLayoutModeSetting: () => "compact",
}));

describe("MyTabs", () => {
  test("renders tab headers", () => {
    const { container } = render(
      <MyTabs
        tabIdx={0}
        onTabChange={() => {}}
        tabHeaders={["Tab A", "Tab B"]}
        tabContents={[<div key="a">Content A</div>, <div key="b">Content B</div>]}
      />,
    );
    expect(container.textContent).toContain("Tab A");
    expect(container.textContent).toContain("Tab B");
  });

  test("renders the selected tab content", () => {
    const { container } = render(
      <MyTabs
        tabIdx={1}
        onTabChange={() => {}}
        tabHeaders={["Tab A", "Tab B"]}
        tabContents={[<div key="a">Content A</div>, <div key="b">Content B</div>]}
      />,
    );
    const body = container.querySelector(".Tab__Body");
    expect(body?.textContent).toContain("Content B");
  });

  test("calls onTabChange when a tab is clicked", () => {
    const onTabChange = vi.fn();
    const { container } = render(
      <MyTabs
        tabIdx={0}
        onTabChange={onTabChange}
        tabHeaders={["Tab A", "Tab B"]}
        tabContents={[<div key="a">Content A</div>, <div key="b">Content B</div>]}
      />,
    );
    const tabs = container.querySelectorAll("[role='tab']");
    fireEvent.click(tabs[1]);
    expect(onTabChange).toHaveBeenCalled();
  });

  test("uses horizontal orientation by default for few tabs", () => {
    const { container } = render(
      <MyTabs tabIdx={0} onTabChange={() => {}} tabHeaders={["Tab A"]} tabContents={[<div key="a">Content A</div>]} />,
    );
    expect(container.querySelector(".Tabs__Horizontal")).toBeTruthy();
  });

  test("respects explicit vertical orientation", () => {
    const { container } = render(
      <MyTabs
        tabIdx={0}
        onTabChange={() => {}}
        tabHeaders={["Tab A"]}
        tabContents={[<div key="a">Content A</div>]}
        orientation="vertical"
      />,
    );
    expect(container.querySelector(".Tabs__Vertical")).toBeTruthy();
  });
});
