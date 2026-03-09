// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import ColumnAttributes from "src/frontend/components/ColumnDescription/ColumnAttributes";

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("ColumnAttributes", () => {
  test("renders attribute key-value pairs", () => {
    const column = { name: "id", type: "int", primaryKey: true } as any;
    const { container } = renderWithTheme(<ColumnAttributes column={column} />);
    expect(container.textContent).toContain("type");
    expect(container.textContent).toContain("int");
    expect(container.textContent).toContain("primaryKey");
    expect(container.textContent).toContain("Yes");
  });

  test("renders boolean false as No", () => {
    const column = { name: "col", nullable: false } as any;
    const { container } = renderWithTheme(<ColumnAttributes column={column} />);
    expect(container.textContent).toContain("No");
  });

  test("renders null values as null string", () => {
    const column = { name: "col", defaultValue: null } as any;
    const { container } = renderWithTheme(<ColumnAttributes column={column} />);
    expect(container.textContent).toContain("null");
  });

  test("renders array values as JSON", () => {
    const column = { name: "col", options: ["a", "b"] } as any;
    const { container } = renderWithTheme(<ColumnAttributes column={column} />);
    expect(container.textContent).toContain('["a","b"]');
  });

  test("excludes the name attribute from display", () => {
    const column = { name: "id", type: "int" } as any;
    const { container } = renderWithTheme(<ColumnAttributes column={column} />);
    const bolds = container.querySelectorAll("b");
    const boldTexts = Array.from(bolds).map((b) => b.textContent);
    expect(boldTexts).not.toContain("name");
  });
});
