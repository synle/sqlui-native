// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

// mock CodeEditorBox since it relies on Monaco
vi.mock("src/frontend/components/CodeEditorBox", () => ({
  default: (props: any) => <pre data-testid="editor">{props.value}</pre>,
}));

import JsonFormatData from "src/frontend/components/JsonFormatData";

describe("JsonFormatData", () => {
  test("renders object data as pretty-printed JSON", () => {
    const data = { name: "test", count: 42 };
    const { container } = render(<JsonFormatData data={data} />);
    expect(container.textContent).toContain('"name": "test"');
    expect(container.textContent).toContain('"count": 42');
  });

  test("renders array data as JSON", () => {
    const data = [1, 2, 3];
    const { container } = render(<JsonFormatData data={data} />);
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("2");
    expect(container.textContent).toContain("3");
  });

  test("renders null data", () => {
    const { container } = render(<JsonFormatData data={null} />);
    expect(container.textContent).toContain("null");
  });
});
