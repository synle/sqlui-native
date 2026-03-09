// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ChoiceDialog from "src/frontend/components/ActionDialogs/ChoiceDialog";

describe("ChoiceDialog", () => {
  const options = [
    { label: "Option A", value: "a" },
    { label: "Option B", value: "b" },
  ];

  test("renders the title", () => {
    const { container } = render(
      <ChoiceDialog open={true} title="Pick one" message="Choose:" options={options} onSelect={() => {}} onDismiss={() => {}} />,
    );
    expect(container.textContent).toContain("Pick one");
  });

  test("renders all options", () => {
    const { container } = render(
      <ChoiceDialog open={true} title="Pick" message="" options={options} onSelect={() => {}} onDismiss={() => {}} />,
    );
    expect(container.textContent).toContain("Option A");
    expect(container.textContent).toContain("Option B");
  });

  test("calls onSelect when an option is clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ChoiceDialog open={true} title="Pick" message="" options={options} onSelect={onSelect} onDismiss={() => {}} />,
    );
    const listItems = container.querySelectorAll("[role='button']");
    fireEvent.click(listItems[0]);
    expect(onSelect).toHaveBeenCalled();
  });

  test("disabled options do not trigger onSelect", () => {
    const onSelect = vi.fn();
    const disabledOptions = [{ label: "Disabled", value: "d", disabled: true }];
    const { container } = render(
      <ChoiceDialog open={true} title="Pick" message="" options={disabledOptions} onSelect={onSelect} onDismiss={() => {}} />,
    );
    const listItems = container.querySelectorAll("[role='button']");
    fireEvent.click(listItems[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
