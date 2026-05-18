// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import HTMLContent from "src/frontend/components/HTMLContent";

describe("HTMLContent", () => {
  test("renders plain html string", () => {
    const { container } = render(<HTMLContent html="<p>Hello</p>" />);
    expect(container.textContent).toContain("Hello");
  });

  test("renders html with links", () => {
    const { container } = render(<HTMLContent html="<a href='#'>Click</a>" />);
    expect(container.querySelector("a")).toBeTruthy();
  });

  test("renders empty html", () => {
    const { container } = render(<HTMLContent html="" />);
    expect(container.firstChild).toBeTruthy();
  });
});
