// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import AlertDialog from "src/frontend/components/ActionDialogs/AlertDialog";

describe("AlertDialog", () => {
  test("renders the message text", () => {
    render(<AlertDialog open={true} message="Something happened" onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Something happened");
  });

  test("renders default title 'Alert'", () => {
    render(<AlertDialog open={true} message="msg" onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Alert");
  });

  test("renders custom title", () => {
    render(<AlertDialog open={true} message="msg" title="Custom Title" onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Custom Title");
  });

  test("renders OK button for non-confirm mode", () => {
    render(<AlertDialog open={true} message="msg" onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("OK");
  });

  test("renders Yes/No buttons for confirm mode", () => {
    render(<AlertDialog open={true} message="msg" isConfirm={true} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Yes");
    expect(document.body.textContent).toContain("No");
  });

  test("calls onYesClick when Yes is clicked in confirm mode", () => {
    const onYesClick = vi.fn();
    render(<AlertDialog open={true} message="msg" isConfirm={true} onYesClick={onYesClick} onDismiss={() => {}} />);
    const buttons = document.body.querySelectorAll("button");
    const yesButton = Array.from(buttons).find((b) => b.textContent?.includes("Yes"));
    fireEvent.click(yesButton!);
    expect(onYesClick).toHaveBeenCalled();
  });

  test("renders nothing visible when open is false", () => {
    render(<AlertDialog open={false} message="hidden msg" onDismiss={() => {}} />);
    expect(document.body.querySelector("[role='dialog']")).toBeNull();
  });
});
