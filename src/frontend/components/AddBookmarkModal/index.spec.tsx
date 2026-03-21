// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";

const mockMutateAsync = vi.fn();
const mockAddToast = vi.fn();

vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useAddBookmarkItem: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: mockAddToast }),
}));

import { AddBookmarkConnectionContent, AddBookmarkQueryContent } from "src/frontend/components/AddBookmarkModal";

describe("AddBookmarkQueryContent", () => {
  const query = {
    id: "q1",
    name: "Test Query",
    connectionId: "c1",
    databaseId: "db1",
    sql: "SELECT 1",
  } as any;

  const onDone = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders with default name, Save and Cancel buttons", () => {
    const { container } = render(<AddBookmarkQueryContent query={query} onDone={onDone} />);

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toContain("Test Query");

    const buttons = container.querySelectorAll("button");
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain("Cancel");
    expect(buttonTexts).toContain("Save");
  });

  test("Cancel button calls onDone", () => {
    const { container } = render(<AddBookmarkQueryContent query={query} onDone={onDone} />);

    const cancelButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Cancel")!;
    fireEvent.click(cancelButton);
    expect(onDone).toHaveBeenCalled();
  });

  test("Save button is disabled when name is empty", () => {
    const { container } = render(<AddBookmarkQueryContent query={query} onDone={onDone} />);

    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    const saveButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Save")!;
    expect(saveButton.disabled).toBe(true);
  });
});

describe("AddBookmarkConnectionContent", () => {
  const connection = {
    id: "c1",
    name: "My Connection",
    dialect: "mysql",
    connection: "mysql://localhost",
  } as any;

  const onDone = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders with default name, Save and Cancel buttons", () => {
    const { container } = render(<AddBookmarkConnectionContent connection={connection} onDone={onDone} />);

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toContain("My Connection");

    const buttons = container.querySelectorAll("button");
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain("Cancel");
    expect(buttonTexts).toContain("Save");
  });

  test("Cancel button calls onDone", () => {
    const { container } = render(<AddBookmarkConnectionContent connection={connection} onDone={onDone} />);

    const cancelButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Cancel")!;
    fireEvent.click(cancelButton);
    expect(onDone).toHaveBeenCalled();
  });
});
