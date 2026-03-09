// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { GlobalFilter } from "src/frontend/components/DataTable/Filter";

describe("GlobalFilter", () => {
  test("renders a search text field", () => {
    const { container } = render(<GlobalFilter id="search" onChange={() => {}} />);
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
  });

  test("renders with Search Table label", () => {
    const { container } = render(<GlobalFilter id="search" onChange={() => {}} />);
    expect(container.textContent).toContain("Search Table");
  });

  test("calls onChange when text is entered", () => {
    const onChange = vi.fn();
    const { container } = render(<GlobalFilter id="search" onChange={onChange} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalled();
  });
});
