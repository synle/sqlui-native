// @vitest-environment jsdom
import { render, act } from "@testing-library/react";
import { vi } from "vitest";
import ShowHideProvider, { useShowHide } from "src/frontend/hooks/useShowHide";

vi.mock("src/frontend/data/config", () => ({
  SessionStorageConfig: {
    get: () => ({}),
    set: vi.fn(),
  },
}));

function TestConsumer() {
  const { visibles, onToggle, onClear, onSet } = useShowHide();
  return (
    <div>
      <span data-testid="visibles">{JSON.stringify(visibles)}</span>
      <button onClick={() => onToggle("key1")}>toggle</button>
      <button onClick={() => onClear()}>clear</button>
      <button onClick={() => onSet({ key2: true })}>set</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ShowHideProvider>
      <TestConsumer />
    </ShowHideProvider>,
  );
}

describe("useShowHide", () => {
  test("starts with empty visibles", () => {
    const { getByTestId } = renderWithProvider();
    expect(getByTestId("visibles").textContent).toContain("{}");
  });

  test("onToggle toggles a key to true", () => {
    const { getByTestId, getByText } = renderWithProvider();
    act(() => {
      getByText("toggle").click();
    });
    expect(getByTestId("visibles").textContent).toContain('"key1":true');
  });

  test("onSet replaces visibles", () => {
    const { getByTestId, getByText } = renderWithProvider();
    act(() => {
      getByText("set").click();
    });
    expect(getByTestId("visibles").textContent).toContain('"key2":true');
  });

  test("onClear resets visibles", () => {
    const { getByTestId, getByText } = renderWithProvider();
    act(() => {
      getByText("toggle").click();
    });
    act(() => {
      getByText("clear").click();
    });
    expect(getByTestId("visibles").textContent).toContain("{}");
  });
});
