// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("src/frontend/components/CodeEditorBox", () => ({
  default: ({ value, language }: { value: string; language: string }) => (
    <pre data-testid="code-editor" data-language={language}>
      {value}
    </pre>
  ),
}));
vi.mock("src/frontend/components/Tabs", () => ({
  default: ({ tabIdx, tabHeaders, tabContents, onTabChange }: any) => (
    <div>
      {tabHeaders.map((header: string, index: number) => (
        <button key={header} onClick={() => onTabChange(index)}>
          {header}
        </button>
      ))}
      {tabContents[tabIdx]}
    </div>
  ),
}));
vi.mock("src/frontend/components/Timer", () => ({ default: () => <span>Timer</span> }));

import FileDataResultBox from "src/frontend/components/ResultBox/FileDataResultBox";

describe("FileDataResultBox", () => {
  test("formats query output and shows the original source unchanged", () => {
    const result = { items: [{ name: "Grace", age: 18 }] };
    const source = '{\n  "items": [{"name":"Ada","age":17}]\n}\n';
    render(<FileDataResultBox raw={[result]} meta={{ rawSource: source, sourceFormat: "jsonc" }} />);

    const editor = screen.getByTestId("code-editor");
    expect(editor.getAttribute("data-language")).toBe("json");
    expect(editor.textContent).toBe(JSON.stringify(result, null, 2));

    fireEvent.click(screen.getByRole("button", { name: "Original File" }));
    expect(screen.getByTestId("code-editor").textContent).toBe(source);
  });

  test("uses plain text mode for YAML source files", () => {
    render(<FileDataResultBox raw={["done"]} meta={{ rawSource: "status: done\n", sourceFormat: "yaml" }} />);

    expect(screen.getByTestId("code-editor").getAttribute("data-language")).toBe("json");
    fireEvent.click(screen.getByRole("button", { name: "Original File" }));
    expect(screen.getByTestId("code-editor").getAttribute("data-language")).toBe("text");
  });

  test("uses XML mode for original text and handles an undefined query result", () => {
    render(<FileDataResultBox raw={[]} meta={{ rawSource: "<root />", sourceFormat: "xml" }} />);

    expect(screen.getByTestId("code-editor").textContent).toBe("undefined");
    fireEvent.click(screen.getByRole("button", { name: "Original File" }));
    expect(screen.getByTestId("code-editor").getAttribute("data-language")).toBe("xml");
    expect(screen.getByTestId("code-editor").textContent).toBe("<root />");
  });

  test("uses JSON mode for JSON source and empty text when source is absent", () => {
    render(<FileDataResultBox raw={[true]} meta={{ sourceFormat: "json" }} />);

    expect(screen.getByTestId("code-editor").textContent).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Original File" }));
    expect(screen.getByTestId("code-editor").getAttribute("data-language")).toBe("json");
    expect(screen.getByTestId("code-editor").textContent).toBe("");
  });
});
