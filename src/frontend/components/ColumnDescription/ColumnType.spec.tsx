// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import ColumnType from "src/frontend/components/ColumnDescription/ColumnType";

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("ColumnType", () => {
  test("renders the column type in lowercase", () => {
    const { container } = renderWithTheme(<ColumnType value="VARCHAR" />);
    expect(container.textContent).toContain("varchar");
  });

  test("renders an italic element", () => {
    const { container } = renderWithTheme(<ColumnType value="INTEGER" />);
    const italic = container.querySelector("i");
    expect(italic).toBeTruthy();
    expect(italic!.textContent).toContain("integer");
  });
});
