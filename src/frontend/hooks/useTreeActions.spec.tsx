// @vitest-environment jsdom
import { render, act } from "@testing-library/react";
import TreeActionsProvider, { useTreeActions } from "src/frontend/hooks/useTreeActions";

function TestConsumer() {
  const { data, setTreeActions } = useTreeActions();
  return (
    <div>
      <span data-testid="showContextMenu">{String(data.showContextMenu)}</span>
      <button onClick={() => setTreeActions({ showContextMenu: false })}>hide</button>
      <button onClick={() => setTreeActions({ showContextMenu: true })}>show</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <TreeActionsProvider>
      <TestConsumer />
    </TreeActionsProvider>,
  );
}

describe("useTreeActions", () => {
  test("defaults showContextMenu to true", () => {
    const { getByTestId } = renderWithProvider();
    expect(getByTestId("showContextMenu").textContent).toContain("true");
  });

  test("setTreeActions can disable context menu", () => {
    const { getByTestId, getByText } = renderWithProvider();
    act(() => {
      getByText("hide").click();
    });
    expect(getByTestId("showContextMenu").textContent).toContain("false");
  });

  test("setTreeActions can re-enable context menu", () => {
    const { getByTestId, getByText } = renderWithProvider();
    act(() => {
      getByText("hide").click();
    });
    act(() => {
      getByText("show").click();
    });
    expect(getByTestId("showContextMenu").textContent).toContain("true");
  });
});
