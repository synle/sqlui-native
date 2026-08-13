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
  tableHeaderFilterGap,
  tableHeaderFilterGapCompact,
  tableHeaderFilterHeight,
  tableHeaderLabelHeight,
  tableHeaderLabelHeightCompact,
  tableHeaderPaddingBlock,
  tableHeaderPaddingBlockCompact,
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
    expect(tableCellHeaderHeight).toBe(86);
    expect(tableCellHeaderHeightCompact).toBe(74);
    expect(tableCellHeight).toBe(35);
    expect(tableCellHeightCompact).toBe(28);
    expect(tableCellWidth).toBe(160);
  });

  test("header height reserves room for the label, the gap and the filter input", () => {
    expect(tableCellHeaderHeight).toBe(
      tableHeaderPaddingBlock * 2 + tableHeaderLabelHeight + tableHeaderFilterGap + tableHeaderFilterHeight,
    );
    expect(tableCellHeaderHeightCompact).toBe(
      tableHeaderPaddingBlockCompact * 2 + tableHeaderLabelHeightCompact + tableHeaderFilterGapCompact + tableHeaderFilterHeight,
    );
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
