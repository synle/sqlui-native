// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { vi } from "vitest";

vi.mock("src/frontend/hooks/useSetting", () => ({
  useSetting: () => ({
    settings: {
      darkMode: "dark",
      layoutMode: "compact",
      editorMode: "advanced",
      editorHeight: "small",
      tableRenderer: "advanced",
      wordWrap: "",
      queryTabOrientation: "",
      querySize: "100",
      tablePageSize: "10",
      deleteMode: "soft-delete",
      animationMode: "",
      querySelectionMode: "new-tab",
    },
    onChange: vi.fn(),
  }),
  useQuerySizeSetting: () => 100,
  useMaxToastsSetting: () => 50,
}));

import Settings, { ChangeSoftDeleteInput } from "src/frontend/components/Settings";

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("Settings", () => {
  test("renders Theme Mode label", () => {
    const { container } = renderWithTheme(<Settings />);
    expect(container.textContent).toContain("Theme Mode");
  });

  test("renders Layout label", () => {
    const { container } = renderWithTheme(<Settings />);
    expect(container.textContent).toContain("Layout");
  });

  test("renders Editor Mode label", () => {
    const { container } = renderWithTheme(<Settings />);
    expect(container.textContent).toContain("Editor Mode");
  });

  test("renders Query Size label", () => {
    const { container } = renderWithTheme(<Settings />);
    expect(container.textContent).toContain("Query Size");
  });

  test("renders Delete Mode label", () => {
    const { container } = renderWithTheme(<Settings />);
    expect(container.textContent).toContain("Delete Mode");
  });
});

describe("ChangeSoftDeleteInput", () => {
  test("renders soft delete option", () => {
    const { container } = renderWithTheme(<ChangeSoftDeleteInput />);
    expect(container.textContent).toContain("Soft Delete");
  });
});
