// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import AlertDialog from "src/frontend/components/ActionDialogs/AlertDialog";

describe("AlertDialog", () => {
  test("renders the message text", () => {
    const { container } = render(
      <AlertDialog open={true} message="Something happened" onDismiss={() => {}} />,
    );
    expect(container.textContent).toContain("Something happened");
  });

  test("renders default title 'Alert'", () => {
    const { container } = render(
      <AlertDialog open={true} message="msg" onDismiss={() => {}} />,
    );
    expect(container.textContent).toContain("Alert");
  });

  test("renders custom title", () => {
    const { container } = render(
      <AlertDialog open={true} message="msg" title="Custom Title" onDismiss={() => {}} />,
    );
    expect(container.textContent).toContain("Custom Title");
  });

  test("renders OK button for non-confirm mode", () => {
    const { container } = render(
      <AlertDialog open={true} message="msg" onDismiss={() => {}} />,
    );
    expect(container.textContent).toContain("OK");
  });

  test("renders Yes/No buttons for confirm mode", () => {
    const { container } = render(
      <AlertDialog open={true} message="msg" isConfirm={true} onDismiss={() => {}} />,
    );
    expect(container.textContent).toContain("Yes");
    expect(container.textContent).toContain("No");
  });

  test("calls onYesClick when Yes is clicked in confirm mode", () => {
    const onYesClick = vi.fn();
    const { container } = render(
      <AlertDialog open={true} message="msg" isConfirm={true} onYesClick={onYesClick} onDismiss={() => {}} />,
    );
    const buttons = container.querySelectorAll("button");
    const yesButton = Array.from(buttons).find((b) => b.textContent?.includes("Yes"));
    fireEvent.click(yesButton!);
    expect(onYesClick).toHaveBeenCalled();
  });

  test("renders nothing visible when open is false", () => {
    const { container } = render(
      <AlertDialog open={false} message="hidden msg" onDismiss={() => {}} />,
    );
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });
});
