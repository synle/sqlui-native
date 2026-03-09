// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ModalDialog from "src/frontend/components/ActionDialogs/ModalDialog";

describe("ModalDialog", () => {
  test("renders the title", () => {
    render(<ModalDialog open={true} title="My Modal" message={<div>Body</div>} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("My Modal");
  });

  test("renders the message content", () => {
    render(<ModalDialog open={true} title="Title" message={<span>Modal Body Content</span>} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Modal Body Content");
  });

  test("renders close button when showCloseButton is true", () => {
    render(
      <ModalDialog open={true} title="Title" message={<div>Body</div>} showCloseButton={true} onDismiss={() => {}} />,
    );
    const closeButton = document.body.querySelector("[aria-label='close']");
    expect(closeButton).toBeTruthy();
  });

  test("does not render close button when showCloseButton is false", () => {
    render(<ModalDialog open={true} title="Title" message={<div>Body</div>} onDismiss={() => {}} />);
    const closeButton = document.body.querySelector("[aria-label='close']");
    expect(closeButton).toBeNull();
  });

  test("calls onDismiss when close button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <ModalDialog open={true} title="Title" message={<div>Body</div>} showCloseButton={true} onDismiss={onDismiss} />,
    );
    const closeButton = document.body.querySelector("[aria-label='close']") as HTMLButtonElement;
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalled();
  });
});
