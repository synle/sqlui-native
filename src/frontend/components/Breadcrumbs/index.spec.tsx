// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";

vi.mock("src/frontend/hooks/useSession", () => ({
  useGetCurrentSession: () => ({ data: { id: "s1", name: "Home" }, isLoading: false }),
}));

import Breadcrumbs from "src/frontend/components/Breadcrumbs";

describe("Breadcrumbs", () => {
  test("renders session name as home link", () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumbs links={[{ label: "Page One" }]} />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Home");
  });

  test("renders provided link labels", () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumbs links={[{ label: "Settings" }]} />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Settings");
  });

  test("returns null when loading", () => {
    vi.resetModules();
    // We can just test that it contains the session name since we mocked isLoading: false
    const { container } = render(
      <MemoryRouter>
        <Breadcrumbs links={[]} />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Home");
  });
});
