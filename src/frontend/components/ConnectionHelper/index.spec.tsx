// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { vi } from "vitest";

vi.mock("src/common/adapters/DataScriptFactory", () => ({
  getConnectionFormInputs: (scheme: string) =>
    scheme === "mysql"
      ? [
          ["username", "Username"],
          ["password", "Password"],
          ["host", "Host"],
          ["port", "Port"],
        ]
      : [],
  SUPPORTED_DIALECTS: ["mysql", "postgres", "sqlite"],
}));

import ConnectionHelper from "src/frontend/components/ConnectionHelper";

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("ConnectionHelper", () => {
  const defaultProps = {
    scheme: "mysql",
    username: "",
    password: "",
    host: "",
    port: "",
    restOfConnectionString: "",
    onChange: vi.fn(),
    onClose: vi.fn(),
  };

  test("renders Apply button", () => {
    const { container } = renderWithTheme(<ConnectionHelper {...defaultProps} />);
    expect(container.textContent).toContain("Apply");
  });

  test("renders Cancel button", () => {
    const { container } = renderWithTheme(<ConnectionHelper {...defaultProps} />);
    expect(container.textContent).toContain("Cancel");
  });

  test("renders scheme selector", () => {
    const { container } = renderWithTheme(<ConnectionHelper {...defaultProps} />);
    expect(container.textContent).toContain("mysql");
  });

  test("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    const { container } = renderWithTheme(<ConnectionHelper {...defaultProps} onClose={onClose} />);
    const cancelButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("Cancel"));
    if (cancelButton) fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  test("shows unsupported message for unknown scheme", () => {
    const { container } = renderWithTheme(<ConnectionHelper {...defaultProps} scheme="unknown" />);
    expect(container.textContent).toContain("not supported");
  });
});
