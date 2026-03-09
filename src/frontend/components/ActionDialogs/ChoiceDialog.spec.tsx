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
    render(<ChoiceDialog open={true} title="Pick one" message="Choose:" options={options} onSelect={() => {}} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Pick one");
  });

  test("renders all options", () => {
    render(<ChoiceDialog open={true} title="Pick" message="" options={options} onSelect={() => {}} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Option A");
    expect(document.body.textContent).toContain("Option B");
  });

  test("calls onSelect when an option is clicked", () => {
    const onSelect = vi.fn();
    render(<ChoiceDialog open={true} title="Pick" message="" options={options} onSelect={onSelect} onDismiss={() => {}} />);
    const listItems = document.body.querySelectorAll("[role='button']");
    fireEvent.click(listItems[0]);
    expect(onSelect).toHaveBeenCalled();
  });

  test("disabled options do not trigger onSelect", () => {
    const onSelect = vi.fn();
    const disabledOptions = [{ label: "Disabled", value: "d", disabled: true }];
    render(<ChoiceDialog open={true} title="Pick" message="" options={disabledOptions} onSelect={onSelect} onDismiss={() => {}} />);
    const listItems = document.body.querySelectorAll("[role='button']");
    fireEvent.click(listItems[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
