// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ dialog: null }),
}));

vi.mock("src/frontend/components/AboutDialog", () => ({
  useShowAboutDialog: () => vi.fn(),
}));

import NativeEventListener from "src/frontend/components/NativeEventListener";

describe("NativeEventListener", () => {
  test("renders null", () => {
    const { container } = render(<NativeEventListener />);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
});
