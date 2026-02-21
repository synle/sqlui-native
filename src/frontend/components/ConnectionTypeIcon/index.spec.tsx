// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import ConnectionTypeIcon from "src/frontend/components/ConnectionTypeIcon";

// mock the useSetting hook
vi.mock("src/frontend/hooks/useSetting", () => ({
  useLayoutModeSetting: () => "compact",
}));

describe("ConnectionTypeIcon", () => {
  test("renders disabled cloud icon when status is not online", () => {
    const { container } = render(<ConnectionTypeIcon status="offline" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    // MUI disabled color renders an SVG icon
    expect(container.querySelector("[data-testid='CloudIcon']")).toBeTruthy();
  });

  test("renders disabled cloud icon when status is undefined", () => {
    const { container } = render(<ConnectionTypeIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  test("renders dialect image when online with supported dialect", () => {
    const { container } = render(<ConnectionTypeIcon status="online" dialect="mysql" />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.alt).toEqual("mysql");
    expect(img?.title).toEqual("mysql");
  });

  test("renders cloud icon when online with unsupported dialect", () => {
    const { container } = render(<ConnectionTypeIcon status="online" dialect="unknown_dialect" />);
    const img = container.querySelector("img");
    expect(img).toBeNull();
    // should fall through to cloud icon
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  test("renders cloud icon when online with no dialect", () => {
    const { container } = render(<ConnectionTypeIcon status="online" />);
    const img = container.querySelector("img");
    expect(img).toBeNull();
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
