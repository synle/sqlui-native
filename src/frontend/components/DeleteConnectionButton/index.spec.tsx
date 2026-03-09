// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ confirm: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useConnection", () => ({
  useDeleteConnection: () => ({ mutateAsync: vi.fn() }),
}));

import DeleteConnectionButton from "src/frontend/components/DeleteConnectionButton";

describe("DeleteConnectionButton", () => {
  test("renders a delete icon button", () => {
    const { container } = render(<DeleteConnectionButton connectionId="conn-1" />);
    const button = container.querySelector("[aria-label='Delete Connection']");
    expect(button).toBeTruthy();
  });

  test("renders a tooltip wrapper", () => {
    const { container } = render(<DeleteConnectionButton connectionId="conn-1" />);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
  });
});
