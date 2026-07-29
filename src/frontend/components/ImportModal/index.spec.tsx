// @vitest-environment jsdom
import { fireEvent, render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mockAddToast = vi.fn();

vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: mockAddToast, dismiss: vi.fn() }),
}));

// Replace CodeEditorBox with a minimal textarea shim so tests can manipulate
// the editor value directly without booting Monaco.
vi.mock("src/frontend/components/CodeEditorBox", () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="mock-code-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

import ImportModal from "src/frontend/components/ImportModal";

/** Tracks the most recent text passed to a File constructor in this test, indexed by File ref.
 *  Bypasses jsdom's incomplete Blob API by inspecting what tests handed in. */
const fileContents = new WeakMap<File, string>();

/** Wraps a string in a File while stashing the source text for MockFileReader to retrieve. */
function makeFile(content: string, name: string, type = "application/json"): File {
  const file = new File([content], name, { type });
  fileContents.set(file, content);
  return file;
}

/** A test-friendly FileReader mock that fires `onload` on a microtask after readAsText. */
class MockFileReader {
  public result: string | null = null;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  readAsText(blob: Blob) {
    // Try the WeakMap first (used by makeFile helper); fall back to attempting blob.text().
    const recorded = fileContents.get(blob as File);
    if (recorded !== undefined) {
      this.result = recorded;
      Promise.resolve().then(() => this.onload?.());
      return;
    }
    // Best-effort fallback for any code path that constructs a File without makeFile.
    if (typeof (blob as any).text === "function") {
      (blob as any).text().then((text: string) => {
        this.result = text;
        this.onload?.();
      });
    } else {
      this.result = "";
      Promise.resolve().then(() => this.onload?.());
    }
  }
}

describe("ImportModal", () => {
  const originalFileReader = globalThis.FileReader;

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom's FileReader is flaky for onload firing; replace with a deterministic shim.
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
  });

  afterEach(() => {
    vi.stubGlobal("FileReader", originalFileReader);
  });

  test("renders empty state with required-input alert and disabled Import button", () => {
    const { container, getByText } = render(<ImportModal onImport={vi.fn()} />);
    expect(getByText("This input is required")).toBeTruthy();
    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    expect(importBtn.disabled).toBe(true);
  });

  test("renders with valid initialValue: button enabled, no error", () => {
    const initial = JSON.stringify([{ _type: "query", sql: "SELECT 1" }]);
    const { container, queryByText } = render(
      <ImportModal onImport={vi.fn()} initialValue={initial} />,
    );
    expect(queryByText("This input is required")).toBeNull();
    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    expect(importBtn.disabled).toBe(false);
  });

  test("typing valid JSON enables the button and clears errors", () => {
    const { container, queryByText, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, {
      target: { value: JSON.stringify([{ _type: "query", sql: "SELECT 1" }]) },
    });

    expect(queryByText("This input is required")).toBeNull();
    expect(queryByText(/Invalid JSON/)).toBeNull();
    expect(queryByText(/Each entry must have a valid _type/)).toBeNull();
    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    expect(importBtn.disabled).toBe(false);
  });

  test("typing invalid JSON shows Invalid JSON format error and disables Import", () => {
    const { container, getByText, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "{not json" } });

    expect(getByText(/Invalid JSON format/)).toBeTruthy();
    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    expect(importBtn.disabled).toBe(true);
  });

  test("missing _type field shows validation error", () => {
    const { container, getByText, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, {
      target: { value: JSON.stringify([{ name: "x" }]) },
    });

    expect(getByText(/Each entry must have a valid _type/)).toBeTruthy();
    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    expect(importBtn.disabled).toBe(true);
  });

  test("unknown _type value shows validation error", () => {
    const { getByText, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, {
      target: { value: JSON.stringify([{ _type: "unknown" }]) },
    });
    expect(getByText(/Each entry must have a valid _type/)).toBeTruthy();
  });

  test("accepts a single object (not array) by wrapping it", () => {
    const { container, queryByText, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({ _type: "connection", name: "Acme DB" }),
      },
    });
    expect(queryByText(/Each entry must have a valid _type/)).toBeNull();
    expect(queryByText(/Invalid JSON/)).toBeNull();
    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    expect(importBtn.disabled).toBe(false);
  });

  test("clicking Import passes raw JSON and 'keepIds' mode by default", () => {
    const onImport = vi.fn();
    const raw = JSON.stringify([{ _type: "query", sql: "SELECT 1" }]);
    const { container } = render(<ImportModal onImport={onImport} initialValue={raw} />);
    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    fireEvent.click(importBtn);
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith(raw, "keepIds");
  });

  test("switching to 'Import as new' radio routes onImport mode to stripIds", () => {
    const onImport = vi.fn();
    const raw = JSON.stringify([{ _type: "query", sql: "SELECT 1" }]);
    const { container } = render(<ImportModal onImport={onImport} initialValue={raw} />);

    // Find the radio whose label contains "Import as new"
    const radios = container.querySelectorAll<HTMLInputElement>("input[type='radio']");
    const stripIdsRadio = Array.from(radios).find((r) => r.value === "stripIds")!;
    fireEvent.click(stripIdsRadio);

    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    fireEvent.click(importBtn);

    expect(onImport).toHaveBeenCalledWith(raw, "stripIds");
  });

  test("selecting a .json file via the hidden input populates the editor", async () => {
    const { container, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const content = JSON.stringify([{ _type: "query", sql: "SELECT 1" }]);
    const fileInput = container.querySelector("input[type='file']") as HTMLInputElement;

    const file = makeFile(content, "import.json");
    fireEvent.change(fileInput, { target: { files: [file] } });

    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    await waitFor(() => {
      expect(editor.value).toEqual(content);
    });
  });

  test("non-.json file via the hidden input is silently rejected (no editor change)", () => {
    const { container, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const fileInput = container.querySelector("input[type='file']") as HTMLInputElement;

    const file = makeFile("plain text", "import.txt", "text/plain");
    fireEvent.change(fileInput, { target: { files: [file] } });

    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    expect(editor.value).toEqual("");
  });

  test("drag-and-drop of a single .json file loads its content into the editor", async () => {
    const { container, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const dropZone = container.firstChild as HTMLElement;
    const content = JSON.stringify([{ _type: "bookmark", name: "Globex" }]);
    const file = makeFile(content, "drop.json");

    fireEvent.dragOver(dropZone, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    await waitFor(() => {
      expect(editor.value).toEqual(content);
    });
  });

  test("drag-and-drop of a non-.json file shows toast and leaves editor unchanged", () => {
    const { container, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const dropZone = container.firstChild as HTMLElement;
    const file = makeFile("x", "image.png", "image/png");

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Only .json files are supported." }),
    );
    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    expect(editor.value).toEqual("");
  });

  test("drag-and-drop of multiple files shows toast", () => {
    const { container } = render(<ImportModal onImport={vi.fn()} />);
    const dropZone = container.firstChild as HTMLElement;
    const file1 = makeFile("{}", "a.json");
    const file2 = makeFile("{}", "b.json");

    fireEvent.drop(dropZone, { dataTransfer: { files: [file1, file2] } });

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Only one file can be imported at a time.",
      }),
    );
  });

  test("drag-and-drop with no files shows toast", () => {
    const { container } = render(<ImportModal onImport={vi.fn()} />);
    const dropZone = container.firstChild as HTMLElement;

    fireEvent.drop(dropZone, { dataTransfer: { files: [] } });

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "No file detected. Please drop a .json file.",
      }),
    );
  });

  test("Import button stays disabled while validation error is shown", () => {
    const { container, getByTestId } = render(<ImportModal onImport={vi.fn()} />);
    const editor = getByTestId("mock-code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "{still not json" } });

    const importBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Import",
    )!;
    expect(importBtn.disabled).toBe(true);
  });
});
