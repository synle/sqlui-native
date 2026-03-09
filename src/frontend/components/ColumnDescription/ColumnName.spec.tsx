// @vitest-environment jsdom
import { render } from "@testing-library/react";
import ColumnName from "src/frontend/components/ColumnDescription/ColumnName";

describe("ColumnName", () => {
  test("renders the column name text", () => {
    const { container } = render(<ColumnName value="user_id" />);
    expect(container.textContent).toContain("user_id");
  });

  test("renders a span element with the value", () => {
    const { container } = render(<ColumnName value="email" />);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
    expect(span!.textContent).toContain("email");
  });
});
