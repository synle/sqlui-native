// @vitest-environment jsdom
import { render, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";

const mockTestConnection = vi.fn().mockResolvedValue(undefined);
vi.mock("src/frontend/hooks/useConnection", () => ({
  useTestConnection: () => ({ mutateAsync: mockTestConnection }),
}));

vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(undefined) }),
}));

import TestConnectionButton from "src/frontend/components/TestConnectionButton";

describe("TestConnectionButton", () => {
  test("renders Test Connection button", () => {
    const { container } = render(<TestConnectionButton connection={{ connection: "mysql://localhost" } as any} />);
    expect(container.textContent).toContain("Test Connection");
  });

  test("renders a button element", () => {
    const { container } = render(<TestConnectionButton connection={{ connection: "mysql://localhost" } as any} />);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
  });

  test("calls testConnection when clicked with a connection string", async () => {
    const conn = { connection: "mysql://localhost" } as any;
    const { container } = render(<TestConnectionButton connection={conn} />);
    const button = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockTestConnection).toHaveBeenCalled();
  });
});
