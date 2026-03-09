// @vitest-environment jsdom
import { render, act } from "@testing-library/react";
import ActionDialogsProvider, { useActionDialogs } from "src/frontend/hooks/useActionDialogs";

function TestConsumer() {
  const { dialogs, alert, dismiss } = useActionDialogs();
  return (
    <div>
      <span data-testid="count">{dialogs.length}</span>
      <span data-testid="type">{dialogs[0]?.type || "none"}</span>
      <button onClick={() => alert("hello")}>alert</button>
      <button onClick={() => dismiss()}>dismiss</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ActionDialogsProvider>
      <TestConsumer />
    </ActionDialogsProvider>,
  );
}

describe("useActionDialogs", () => {
  test("starts with no dialogs", () => {
    const { getByTestId } = renderWithProvider();
    expect(getByTestId("count").textContent).toContain("0");
  });

  test("alert adds a dialog", () => {
    const { getByTestId, getByText } = renderWithProvider();
    act(() => {
      getByText("alert").click();
    });
    expect(getByTestId("count").textContent).toContain("1");
    expect(getByTestId("type").textContent).toContain("alert");
  });

  test("dismiss removes a dialog", () => {
    const { getByTestId, getByRole } = renderWithProvider();
    act(() => {
      getByRole("button", { name: "alert" }).click();
    });
    const countAfterAlert = Number(getByTestId("count").textContent);
    act(() => {
      getByRole("button", { name: "dismiss" }).click();
    });
    expect(Number(getByTestId("count").textContent)).toBe(countAfterAlert - 1);
  });
});
