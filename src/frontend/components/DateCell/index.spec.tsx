// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";

import DateCell from "src/frontend/components/DateCell";

describe("DateCell", () => {
  test("returns null when no timestamp is provided", () => {
    const { container } = render(<DateCell />);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  test("renders a date when timestamp is provided", () => {
    const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
    const { container } = render(<DateCell timestamp={timestamp} />);
    const dateText = container.textContent;
    expect(dateText).toBeTruthy();
    expect(dateText!.length).toBeGreaterThan(0);
  });

  test("clicking toggles between short and full date display", () => {
    const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
    const date = new Date(timestamp);
    const shortDate = date.toLocaleDateString();
    const fullDate = date.toLocaleString();

    const { container } = render(<DateCell timestamp={timestamp} />);
    const typography = container.querySelector("p")!;

    expect(typography.textContent).toBe(shortDate);

    fireEvent.click(typography);
    expect(typography.textContent).toBe(fullDate);

    fireEvent.click(typography);
    expect(typography.textContent).toBe(shortDate);
  });
});
