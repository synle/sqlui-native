// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import {
  ColumnResizer,
  defaultTableHeight,
  tableCellHeaderHeight,
  tableCellHeaderHeightCompact,
  tableCellHeight,
  tableCellHeightCompact,
  tableCellWidth,
  StyledDivContainer,
  StyledDivValueCell,
  StyledDivHeaderRow,
  StyledDivContentRow,
  StyledDivHeaderCell,
  StyledDivHeaderCellLabel,
  StyledDivContentRowForVirualized,
  StyledDivHeaderCellForVirtualized,
  StyledDivValueCellForVirtualized,
} from "src/frontend/components/DataTable/DataTableComponents";

describe("DataTableComponents", () => {
  test("constants are well-defined", () => {
    expect(defaultTableHeight).toBe("85vh");
    expect(tableCellHeaderHeight).toBe(75);
    expect(tableCellHeaderHeightCompact).toBe(60);
    expect(tableCellHeight).toBe(35);
    expect(tableCellHeightCompact).toBe(28);
    expect(tableCellWidth).toBe(160);
  });

  test("ColumnResizer renders and dispatches mouse/touch events", () => {
    const onMouseDown = vi.fn();
    const onTouchStart = vi.fn();
    const { container } = render(<ColumnResizer isResizing={true} onMouseDown={onMouseDown} onTouchStart={onTouchStart} />);
    const resizer = container.firstChild as HTMLElement;
    expect(resizer).toBeTruthy();
    fireEvent.mouseDown(resizer);
    fireEvent.touchStart(resizer);
    expect(onMouseDown).toHaveBeenCalled();
    expect(onTouchStart).toHaveBeenCalled();
  });

  test("ColumnResizer works without optional handlers", () => {
    const { container } = render(<ColumnResizer />);
    const resizer = container.firstChild as HTMLElement;
    fireEvent.mouseDown(resizer);
    fireEvent.touchStart(resizer);
    expect(resizer).toBeTruthy();
  });

  test("ColumnResizer non-resizing variant renders", () => {
    const { container } = render(<ColumnResizer isResizing={false} />);
    expect(container.firstChild).toBeTruthy();
  });

  test("styled components render as divs", () => {
    const components = [
      StyledDivContainer,
      StyledDivValueCell,
      StyledDivHeaderRow,
      StyledDivContentRow,
      StyledDivHeaderCell,
      StyledDivHeaderCellLabel,
      StyledDivContentRowForVirualized,
      StyledDivHeaderCellForVirtualized,
      StyledDivValueCellForVirtualized,
    ];
    components.forEach((Component) => {
      const { container } = render(<Component>x</Component>);
      expect(container.firstChild?.nodeName.toLowerCase()).toBe("div");
    });
  });
});
