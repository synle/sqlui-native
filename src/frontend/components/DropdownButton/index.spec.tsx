// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import DropdownButton from "src/frontend/components/DropdownButton";

describe("DropdownButton", () => {
  test("renders the trigger children", () => {
    const { container } = render(
      <DropdownButton id="test" options={[]}>
        <span>Click Me</span>
      </DropdownButton>,
    );
    expect(container.textContent).toContain("Click Me");
  });

  test("renders with aria-label", () => {
    const { container } = render(
      <DropdownButton id="test" options={[]}>
        <span>Trigger</span>
      </DropdownButton>,
    );
    const trigger = container.querySelector("[aria-label='actions dropdown']");
    expect(trigger).toBeTruthy();
  });

  test("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <DropdownButton id="test" options={[]} onToggle={onToggle}>
        <span>Trigger</span>
      </DropdownButton>,
    );
    const trigger = container.querySelector(".DropdownButton") as HTMLElement;
    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenCalled();
  });

  test("sets aria-expanded when open", () => {
    const { container } = render(
      <DropdownButton id="test" options={[]} open={true}>
        <span>Trigger</span>
      </DropdownButton>,
    );
    const trigger = container.querySelector(".DropdownButton") as HTMLElement;
    expect(trigger.getAttribute("aria-expanded")).toContain("true");
  });
});
