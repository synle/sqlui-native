// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/components/MissionControl", () => ({
  allMenuKeys: [],
}));

vi.mock("src/frontend/components/SessionSelectionForm", () => ({
  default: () => <div>SessionForm</div>,
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useSession", () => ({
  useGetSessions: () => ({ isLoading: false }),
  useGetCurrentSession: () => ({ isLoading: false, data: null }),
}));

import SessionSelectionModal from "src/frontend/components/SessionSelectionModal";

describe("SessionSelectionModal", () => {
  test("renders null", () => {
    const { container } = render(<SessionSelectionModal />);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
});
