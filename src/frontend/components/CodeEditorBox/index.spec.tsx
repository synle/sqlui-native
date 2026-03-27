// @vitest-environment jsdom
import { render, fireEvent, act } from "@testing-library/react";
import { createRef } from "react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CodeEditorBox, { DEFAULT_DEBOUNCE_MS, MAX_DEBOUNCE_MS, EditorRef } from "src/frontend/components/CodeEditorBox";

const theme = createTheme();

// force simple editor mode so we get a real textarea (Monaco needs a browser)
vi.mock("src/frontend/hooks/useSetting", () => ({
  useEditorModeSetting: () => "simple",
  useWordWrapSetting: () => false,
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("CodeEditorBox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders with initial value", () => {
    const { container } = renderWithTheme(<CodeEditorBox value="SELECT 1" />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe("SELECT 1");
  });

  test("calls onChange on blur", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "new query" } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith("new query");
  });

  test("calls onChange with debounce on live typing (default debounce)", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "typing..." } });

    // onChange should not be called yet (debounce not elapsed)
    expect(onChange).not.toHaveBeenCalled();

    // advance past default debounce
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 10);
    });

    expect(onChange).toHaveBeenCalledWith("typing...");
  });

  test("debounce resets on rapid typing", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} debounceMs={100} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "a" } });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    fireEvent.change(textarea, { target: { value: "ab" } });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    fireEvent.change(textarea, { target: { value: "abc" } });

    // none should have fired yet — each keystroke resets the timer
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // only the last value should have been emitted
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  test("respects custom debounceMs", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} debounceMs={300} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "delayed" } });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onChange).toHaveBeenCalledWith("delayed");
  });

  test("clamps debounceMs to MAX_DEBOUNCE_MS", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} debounceMs={5000} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "clamped" } });

    // should fire at MAX_DEBOUNCE_MS, not 5000
    act(() => {
      vi.advanceTimersByTime(MAX_DEBOUNCE_MS + 10);
    });
    expect(onChange).toHaveBeenCalledWith("clamped");
  });

  test("blur fires onChange immediately even if debounce is pending", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} debounceMs={300} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "quick blur" } });
    // debounce hasn't fired yet
    expect(onChange).not.toHaveBeenCalled();

    // blur fires immediately
    fireEvent.blur(textarea);
    expect(onChange).toHaveBeenCalledWith("quick blur");
  });

  test("blur skips onChange if value has not changed since last emit", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} debounceMs={50} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "same" } });

    // let debounce fire
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("same");

    // blur with the same value — should not call onChange again
    fireEvent.blur(textarea);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("blur cancels pending debounce timer", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} debounceMs={300} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "blurred" } });
    fireEvent.blur(textarea);

    // blur already called onChange
    expect(onChange).toHaveBeenCalledTimes(1);

    // advancing past debounce should not trigger a second call
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("editorRef.getValue returns current textarea value", () => {
    const editorRef = createRef<EditorRef>();
    const { container } = renderWithTheme(<CodeEditorBox value="initial" editorRef={editorRef} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    expect(editorRef.current?.getValue()).toBe("initial");

    fireEvent.change(textarea, { target: { value: "updated" } });
    expect(editorRef.current?.getValue()).toBe("updated");
  });

  test("editorRef.getValue returns latest value before debounce fires", () => {
    const onChange = vi.fn();
    const editorRef = createRef<EditorRef>();
    const { container } = renderWithTheme(<CodeEditorBox value="" onChange={onChange} editorRef={editorRef} debounceMs={300} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "not yet synced" } });

    // onChange hasn't been called — state is stale
    expect(onChange).not.toHaveBeenCalled();

    // but editorRef.getValue reads directly from the textarea
    expect(editorRef.current?.getValue()).toBe("not yet synced");
  });

  test("renders placeholder text", () => {
    const { container } = renderWithTheme(<CodeEditorBox placeholder="Enter SQL here" />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe("Enter SQL here");
  });

  test("does not call onChange when no typing occurs", () => {
    const onChange = vi.fn();
    renderWithTheme(<CodeEditorBox value="static" onChange={onChange} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
