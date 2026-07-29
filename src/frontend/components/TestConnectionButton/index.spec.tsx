// @vitest-environment jsdom
import { render, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const mockModal = vi.fn();
const mockAlert = vi.fn().mockResolvedValue(undefined);
const mockDismiss = vi.fn();
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: mockModal, alert: mockAlert, dismiss: mockDismiss }),
}));

const proxyTestMock = vi.fn();
vi.mock("src/frontend/data/api", () => ({
  ProxyApi: { test: (...args: any[]) => proxyTestMock(...args) },
}));

vi.mock("src/frontend/components/Timer", () => ({
  default: ({ startTime }: any) => <span>timer:{startTime}</span>,
}));

import TestConnectionButton, {
  TestConnectionModalBody,
} from "src/frontend/components/TestConnectionButton";

beforeEach(() => {
  mockModal.mockClear();
  mockAlert.mockClear();
  mockDismiss.mockClear();
  proxyTestMock.mockReset();
});

describe("TestConnectionButton", () => {
  test("renders Test Connection button", () => {
    const { container } = render(
      <TestConnectionButton connection={{ connection: "mysql://localhost" } as any} />,
    );
    expect(container.textContent).toContain("Test Connection");
  });

  test("opens modal when clicked with a connection string", async () => {
    const conn = { connection: "mysql://localhost" } as any;
    const { container } = render(<TestConnectionButton connection={conn} />);
    const button = container.querySelector("button")!;
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockModal).toHaveBeenCalled();
  });

  test("shows alert when clicked without a connection string", async () => {
    const conn = { connection: "" } as any;
    const { container } = render(<TestConnectionButton connection={conn} />);
    const button = container.querySelector("button")!;
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockAlert).toHaveBeenCalledWith("Connection is required to perform testing.");
  });
});

describe("TestConnectionModalBody", () => {
  test("renders loading state initially", async () => {
    proxyTestMock.mockImplementation(() => new Promise(() => {})); // hangs
    const { container } = render(
      <TestConnectionModalBody
        connection={{ name: "MyDb", connection: "mysql://u:p@host:3306" } as any}
        onDismiss={() => {}}
      />,
    );
    expect(container.textContent).toContain("Testing connection");
    expect(container.textContent).toContain("Cancel");
    // Parsed connection details should show
    expect(container.textContent).toContain("Username");
    expect(container.textContent).toContain("Host");
  });

  test("renders success state after successful test", async () => {
    proxyTestMock.mockResolvedValue({
      dialect: "mysql",
      diagnostics: [{ name: "DNS", success: true, message: "ok" }],
    });
    const { container } = render(
      <TestConnectionModalBody
        connection={{ name: "MyDb", connection: "mysql://u:p@host:3306" } as any}
        onDismiss={() => {}}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Successfully connected");
    });
    expect(container.textContent).toContain("Dialect");
    expect(container.textContent).toContain("Diagnostics");
    expect(container.textContent).toContain("DNS");
    expect(container.textContent).toContain("Close");
  });

  test("renders error state when test fails", async () => {
    proxyTestMock.mockRejectedValue(new Error("Connection refused"));
    const { container } = render(
      <TestConnectionModalBody
        connection={{ name: "MyDb", connection: "mysql://u:p@host:3306" } as any}
        onDismiss={() => {}}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Failed to connect");
    });
    expect(container.textContent).toContain("Connection refused");
    expect(container.textContent).toContain("Retry");
    expect(container.textContent).toContain("Close");
  });

  test("clicking Cancel during loading goes to cancelled state", async () => {
    proxyTestMock.mockImplementation(() => new Promise(() => {}));
    const { container, getByText } = render(
      <TestConnectionModalBody
        connection={{ name: "MyDb", connection: "mysql://u:p@host:3306" } as any}
        onDismiss={() => {}}
      />,
    );
    fireEvent.click(getByText("Cancel"));
    await waitFor(() => {
      expect(container.textContent).toContain("cancelled");
    });
    expect(container.textContent).toContain("Retry");
  });

  test("Close button invokes onDismiss", async () => {
    proxyTestMock.mockResolvedValue({ dialect: "mysql" });
    const onDismiss = vi.fn();
    const { getByText } = render(
      <TestConnectionModalBody
        connection={{ connection: "mysql://h" } as any}
        onDismiss={onDismiss}
      />,
    );
    await waitFor(() => getByText("Close"));
    fireEvent.click(getByText("Close"));
    expect(onDismiss).toHaveBeenCalled();
  });

  test("Retry re-runs ProxyApi.test after error", async () => {
    proxyTestMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ dialect: "mysql" });
    const { container, getByText } = render(
      <TestConnectionModalBody
        connection={{ connection: "mysql://h" } as any}
        onDismiss={() => {}}
      />,
    );
    await waitFor(() => getByText("Retry"));
    expect(proxyTestMock).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText("Retry"));
    await waitFor(() => {
      expect(container.textContent).toContain("Successfully connected");
    });
    expect(proxyTestMock).toHaveBeenCalledTimes(2);
  });
});
