// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ModalDialog from "src/frontend/components/ActionDialogs/ModalDialog";

describe("ModalDialog", () => {
  test("renders the title", () => {
    const { container } = render(<ModalDialog open={true} title="My Modal" message={<div>Body</div>} onDismiss={() => {}} />);
    expect(container.textContent).toContain("My Modal");
  });

  test("renders the message content", () => {
    const { container } = render(<ModalDialog open={true} title="Title" message={<span>Modal Body Content</span>} onDismiss={() => {}} />);
    expect(container.textContent).toContain("Modal Body Content");
  });

  test("renders close button when showCloseButton is true", () => {
    const { container } = render(
      <ModalDialog open={true} title="Title" message={<div>Body</div>} showCloseButton={true} onDismiss={() => {}} />,
    );
    const closeButton = container.querySelector("[aria-label='close']");
    expect(closeButton).toBeTruthy();
  });

  test("does not render close button when showCloseButton is false", () => {
    const { container } = render(<ModalDialog open={true} title="Title" message={<div>Body</div>} onDismiss={() => {}} />);
    const closeButton = container.querySelector("[aria-label='close']");
    expect(closeButton).toBeNull();
  });

  test("calls onDismiss when close button is clicked", () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <ModalDialog open={true} title="Title" message={<div>Body</div>} showCloseButton={true} onDismiss={onDismiss} />,
    );
    const closeButton = container.querySelector("[aria-label='close']") as HTMLButtonElement;
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalled();
  });
});
