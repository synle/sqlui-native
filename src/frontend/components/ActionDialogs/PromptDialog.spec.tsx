// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/components/CodeEditorBox", () => ({
  default: (props: any) => <textarea data-testid="editor" value={props.value} onChange={(e) => props.onChange?.(e.target.value)} />,
}));

import PromptDialog from "src/frontend/components/ActionDialogs/PromptDialog";

describe("PromptDialog", () => {
  test("renders the message as label", () => {
    render(<PromptDialog open={true} message="Enter name" onSaveClick={() => {}} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Enter name");
  });

  test("renders the title", () => {
    render(<PromptDialog open={true} message="msg" title="My Prompt" onSaveClick={() => {}} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("My Prompt");
  });

  test("renders default title 'Prompt' when none given", () => {
    render(<PromptDialog open={true} message="msg" onSaveClick={() => {}} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Prompt");
  });

  test("renders save button with custom label", () => {
    render(<PromptDialog open={true} message="msg" saveLabel="Apply" onSaveClick={() => {}} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Apply");
  });

  test("renders default save label 'Save Changes'", () => {
    render(<PromptDialog open={true} message="msg" value="something" onSaveClick={() => {}} onDismiss={() => {}} />);
    expect(document.body.textContent).toContain("Save Changes");
  });
});
