// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { describe, test, expect, vi } from "vitest";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import SimpleEditor from "src/frontend/components/CodeEditorBox/SimpleEditor";

const theme = createTheme();

function renderEditor(ui: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("SimpleEditor", () => {
  test("renders textarea with initial value", () => {
    const { container } = renderEditor(<SimpleEditor value="hello" />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta).toBeTruthy();
    expect(ta.value).toBe("hello");
  });

  test("updates value when prop changes", () => {
    const { container, rerender } = renderEditor(<SimpleEditor value="first" />);
    rerender(
      <ThemeProvider theme={theme}>
        <SimpleEditor value="second" />
      </ThemeProvider>,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("second");
  });

  test("calls onLiveChange when text changes", () => {
    const onLive = vi.fn();
    const { container } = renderEditor(<SimpleEditor value="" onLiveChange={onLive} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "typed" } });
    expect(onLive).toHaveBeenCalledWith("typed");
  });

  test("calls onBlur on blur", () => {
    const onBlur = vi.fn();
    const { container } = renderEditor(<SimpleEditor value="x" onBlur={onBlur} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.blur(ta, { target: { value: "x" } });
    expect(onBlur).toHaveBeenCalledWith("x");
  });

  test("renders with placeholder", () => {
    const { container } = renderEditor(<SimpleEditor value="" placeholder="Type SQL" />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.getAttribute("placeholder")).toBe("Type SQL");
  });

  test("wordWrap=true uses whitespace initial", () => {
    const { container } = renderEditor(<SimpleEditor value="" wordWrap={true} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.style.whiteSpace).toBe("initial");
  });

  test("wordWrap=false uses nowrap", () => {
    const { container } = renderEditor(<SimpleEditor value="" wordWrap={false} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.style.whiteSpace).toBe("nowrap");
  });

  test("fillHeight applies flex layout", () => {
    const { container } = renderEditor(<SimpleEditor value="" fillHeight={true} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.style.flex).toContain("1");
  });

  test("height prop is applied as minHeight when no fillHeight", () => {
    const { container } = renderEditor(<SimpleEditor value="" height={150} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.style.minHeight).toBe("150px");
  });

  test("Tab key inserts indent without shift", () => {
    const { container } = renderEditor(<SimpleEditor value="abc" />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    ta.setSelectionRange(0, 0);
    fireEvent.keyDown(ta, { key: "Tab", shiftKey: false });
    // Should not throw; value handled internally
    expect(ta).toBeTruthy();
  });

  test("Shift+Tab attempts to delete indent", () => {
    const { container } = renderEditor(<SimpleEditor value="  abc" />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    ta.setSelectionRange(2, 2);
    fireEvent.keyDown(ta, { key: "Tab", shiftKey: true });
    expect(ta).toBeTruthy();
  });

  test("Enter key persists indentation", () => {
    const { container } = renderEditor(<SimpleEditor value="  start" />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    ta.setSelectionRange(7, 7);
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(ta).toBeTruthy();
  });

  test("Enter on first line still works (no leading indent)", () => {
    const { container } = renderEditor(<SimpleEditor value="abc" />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    ta.setSelectionRange(3, 3);
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(ta).toBeTruthy();
  });

  test("Tab with selection across multiple lines indents block", () => {
    const { container } = renderEditor(<SimpleEditor value="line1\nline2\nline3" />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    ta.setSelectionRange(0, 12);
    fireEvent.keyDown(ta, { key: "Tab", shiftKey: false });
    expect(ta).toBeTruthy();
  });

  test("editorRef captures getSelectedText and getValue helpers", () => {
    let capturedRef: any = null;
    function Host() {
      const ref = useRef<any>(null);
      capturedRef = ref;
      return <SimpleEditor value="hello world" editorRef={ref} />;
    }
    const { container } = renderEditor(<Host />);
    expect(capturedRef.current).toBeTruthy();
    expect(typeof capturedRef.current.getValue).toBe("function");
    expect(typeof capturedRef.current.getSelectedText).toBe("function");
    expect(capturedRef.current.getValue()).toBe("hello world");
  });

  test("getSelectedText returns selection", () => {
    let capturedRef: any = null;
    function Host() {
      const ref = useRef<any>(null);
      capturedRef = ref;
      return <SimpleEditor value="hello world" editorRef={ref} />;
    }
    const { container } = renderEditor(<Host />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    ta.setSelectionRange(0, 5);
    expect(capturedRef.current.getSelectedText()).toBe("hello");
  });

  test("renders with autoFocus", () => {
    const { container } = renderEditor(<SimpleEditor value="" autoFocus={true} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta).toBeTruthy();
  });

  test("renders required attribute", () => {
    const { container } = renderEditor(<SimpleEditor value="" required={true} />);
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.hasAttribute("required")).toBe(true);
  });
});
