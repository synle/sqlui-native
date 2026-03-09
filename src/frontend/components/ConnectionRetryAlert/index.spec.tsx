// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

const mockReconnect = vi.fn().mockResolvedValue(undefined);
vi.mock("src/frontend/hooks/useConnection", () => ({
  useRetryConnection: () => ({ mutateAsync: mockReconnect }),
}));

vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: vi.fn(), dismiss: vi.fn() }),
}));

import ConnectionRetryAlert from "src/frontend/components/ConnectionRetryAlert";

describe("ConnectionRetryAlert", () => {
  test("renders error message", () => {
    const { container } = render(<ConnectionRetryAlert connectionId="conn-1" />);
    expect(container.textContent).toContain("Can't connect to server");
  });

  test("renders a Reconnect button", () => {
    const { container } = render(<ConnectionRetryAlert connectionId="conn-1" />);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.textContent).toContain("Reconnect");
  });

  test("calls reconnect when button is clicked", () => {
    const { container } = render(<ConnectionRetryAlert connectionId="conn-1" />);
    const button = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(button);
    expect(mockReconnect).toHaveBeenCalled();
  });
});
