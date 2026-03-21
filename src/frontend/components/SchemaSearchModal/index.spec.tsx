// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/data/api", () => ({
  ProxyApi: {
    searchSchema: vi.fn().mockResolvedValue([]),
  },
}));

import SchemaSearchModal from "src/frontend/components/SchemaSearchModal";

describe("SchemaSearchModal", () => {
  const onNavigate = vi.fn();

  test("renders without crashing", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    expect(container).toBeTruthy();
  });

  test("renders search input", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
    expect(input?.getAttribute("placeholder")).toContain("Search");
  });

  test("renders view mode toggle buttons", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button");
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain("Simple");
    expect(buttonTexts).toContain("Detailed");
  });

  test("shows info alert when no search has been performed", () => {
    const { container } = render(<SchemaSearchModal onNavigate={onNavigate} />);
    const alert = container.querySelector(".MuiAlert-root");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Search across all cached schema metadata");
  });
});
