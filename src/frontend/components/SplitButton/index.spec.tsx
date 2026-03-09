// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import SplitButton from "src/frontend/components/SplitButton";

describe("SplitButton", () => {
  test("renders the primary button label", () => {
    const { container } = render(
      <SplitButton id="test" label="Create" onClick={() => {}} options={[]} />,
    );
    expect(container.textContent).toContain("Create");
  });

  test("calls onClick when primary button is clicked", () => {
    const onClick = vi.fn();
    const { container } = render(
      <SplitButton id="test" label="Create" onClick={onClick} options={[]} />,
    );
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[0]);
    expect(onClick).toHaveBeenCalled();
  });

  test("shows dropdown options when arrow button is clicked", () => {
    const { container } = render(
      <SplitButton
        id="test-menu"
        label="Create"
        onClick={() => {}}
        options={[
          { label: "Option A", onClick: () => {} },
          { label: "Option B", onClick: () => {} },
        ]}
      />,
    );
    const buttons = container.querySelectorAll("button");
    // click the dropdown arrow (second button)
    fireEvent.click(buttons[1]);
    expect(container.textContent).toContain("Option A");
    expect(container.textContent).toContain("Option B");
  });

  test("shows 'No options.' when options array is empty", () => {
    const { container } = render(
      <SplitButton id="test" label="Create" onClick={() => {}} options={[]} />,
    );
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[1]);
    expect(container.textContent).toContain("No options.");
  });

  test("calls option onClick when a menu item is clicked", () => {
    const optionClick = vi.fn();
    const { container } = render(
      <SplitButton
        id="test-menu"
        label="Create"
        onClick={() => {}}
        options={[{ label: "Do Thing", onClick: optionClick }]}
      />,
    );
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[1]);
    const menuItem = container.querySelector("[role='menuitem']") as HTMLElement;
    fireEvent.click(menuItem);
    expect(optionClick).toHaveBeenCalled();
  });

  test("renders startIcon on primary button when provided", () => {
    const { container } = render(
      <SplitButton
        id="test"
        label="Create"
        onClick={() => {}}
        options={[]}
        startIcon={<span data-testid="icon">+</span>}
      />,
    );
    expect(container.querySelector("[data-testid='icon']")).toBeTruthy();
  });
});
