// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Select from "src/frontend/components/Select";

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("Select", () => {
  test("renders a native select without label", () => {
    const { container } = renderWithTheme(
      <Select value="a">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );
    const select = container.querySelector("select");
    expect(select).toBeTruthy();
    expect(select?.value).toEqual("a");
  });

  test("calls onChange with new value when selection changes (no label)", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <Select value="a" onChange={onChange}>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  test("renders MUI FormControl with label when label is provided", () => {
    const { container } = renderWithTheme(
      <Select value="x" label="Choose">
        <option value="x">X</option>
        <option value="y">Y</option>
      </Select>,
    );
    // should have a label element
    const label = container.querySelector("label");
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain("Choose");
  });

  test("calls onChange with label variant", () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <Select value="x" label="Choose" onChange={onChange}>
        <option value="x">X</option>
        <option value="y">Y</option>
      </Select>,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "y" } });
    expect(onChange).toHaveBeenCalledWith("y");
  });

  test("does not crash when onChange is not provided", () => {
    const { container } = renderWithTheme(
      <Select value="a">
        <option value="a">Option A</option>
      </Select>,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    // should not throw
    fireEvent.change(select, { target: { value: "a" } });
  });
});
