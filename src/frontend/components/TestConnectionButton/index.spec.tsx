// @vitest-environment jsdom
import { render, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";

const mockModal = vi.fn();
const mockAlert = vi.fn().mockResolvedValue(undefined);
const mockDismiss = vi.fn();
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: mockModal, alert: mockAlert, dismiss: mockDismiss }),
}));

vi.mock("src/frontend/hooks/useConnection", () => ({
  useTestConnection: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
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

  test("opens modal when clicked with a connection string", async () => {
    const conn = { connection: "mysql://localhost" } as any;
    const { container } = render(<TestConnectionButton connection={conn} />);
    const button = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockModal).toHaveBeenCalled();
  });

  test("shows alert when clicked without a connection string", async () => {
    const conn = { connection: "" } as any;
    const { container } = render(<TestConnectionButton connection={conn} />);
    const button = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockAlert).toHaveBeenCalledWith("Connection is required to perform testing.");
  });
});
