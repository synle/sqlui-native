import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  useBlockLayout,
  useFilters,
  useGlobalFilter,
  usePagination,
  useResizeColumns,
  useSortBy,
  useTable,
} from 'react-table';
import React, { useEffect, useRef, useState } from 'react';
import { DataTableProps } from 'src/frontend/components/DataTable';
import {
  ColumnResizer,
  StyledDivContentRow,
  StyledDivHeaderCell,
  StyledDivHeaderCellLabel,
  StyledDivHeaderRow,
  StyledDivValueCell,
  tableCellWidth,
  tableCellHeight,
} from 'src/frontend/components/DataTable/DataTableComponents';
import { GlobalFilter, SimpleColumnFilter } from 'src/frontend/components/DataTable/Filter';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useAddDataSnapshot } from 'src/frontend/hooks/useDataSnapshot';
import { AutoSizer, List, WindowScroller } from "react-virtualized";


export default function FullPageDataTable(props: DataTableProps): JSX.Element | null {
  const { data } = props;
  const [columns, setColumns] = useState([]);
  useEffect(() => {
    let newColumns = props.columns;

    // get the client width, then see if we need to subtract the left pane
    let widthToUse = document.querySelector('.LayoutTwoColumns__LeftPane')?.clientWidth || 0;
    if (widthToUse > 0) {
      widthToUse += 30;
    }
    widthToUse = window.innerWidth - widthToUse;

    let columnsToSize = newColumns.length;
    for (const column of newColumns) {
      if (column.width) {
        columnsToSize--;
        widthToUse -= column.width;
      }
    }

    widthToUse = Math.max(Math.floor(widthToUse / columnsToSize), tableCellWidth);

    newColumns = newColumns.map((column) => {
      return {
        ...column,
        width: column.width || widthToUse,
      };
    });

    //@ts-ignore
    setColumns(newColumns);
  }, [props.columns]);
  //@ts-ignore
  const fullScreen = props.fullScreen === true;
  //@ts-ignore
  const description = props.description || `Data Snapshot - ${new Date()}`;
  const { mutateAsync: addDataSnapshot } = useAddDataSnapshot();
  const [openContextMenuRowIdx, setOpenContextMenuRowIdx] = useState(-1);
  const anchorEl = useRef<HTMLElement | null>(null);

  // figure out the width
  let tableCellWidthToUse = tableCellWidth;

  // @ts-ignore
  const totalWidth = document.querySelector('.LayoutTwoColumns__RightPane')?.offsetWidth - 20 || 0;
  if (columns.length * tableCellWidth < totalWidth) {
    tableCellWidthToUse = Math.floor(totalWidth / columns.length);
  }

  const allRecordSize = data.length;
  const pageSizeToUse = allRecordSize;
  const { headerGroups, page, prepareRow, setGlobalFilter } = useTable(
    {
      initialState: {
        pageSize: pageSizeToUse,
      },
      columns,
      data,
      // @ts-ignore
      defaultColumn: {
        Filter: SimpleColumnFilter,
        width: tableCellWidthToUse, // set default width for all columns
      },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useBlockLayout,
    useResizeColumns,
  );

  const targetRowContextOptions = (props.rowContextOptions || []).map((rowContextOption) => ({
    ...rowContextOption,
    onClick: () =>
      rowContextOption.onClick && rowContextOption.onClick(data[openContextMenuRowIdx]),
  }));

  const onShowExpandedData = async () => {
    try {
      const dataSnapshot = await addDataSnapshot({
        values: data,
        description,
      });

      if (dataSnapshot?.id) {
        window.openAppLink(`/data_snapshot/${dataSnapshot.id}`);
      }
    } finally {
    }
  };

  // MainPage__RightPane
  const [scrollTop, setScrollTop] = useState(0);

  const rowRenderer = (props) => {
    const { index, key, style, isVisible, isScrolling } = props;
    const rowIdx = index;
    const row = page[rowIdx];

    try{
      prepareRow(row);

      return (
        <StyledDivContentRow
          key={key}
          data-row-idx={rowIdx}
          sx={{
            cursor: props.onRowClick ? 'pointer' : '',
          }}
          onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}
          style={style}>
          {row.cells.map((cell, colIdx) => {
            let dropdownContent: any;
            if (colIdx === 0 && targetRowContextOptions.length > 0) {
              dropdownContent = (
                <DropdownMenu
                  id={`data-table-row-dropdown-${rowIdx}`}
                  options={targetRowContextOptions}
                  onToggle={(newOpen) => {
                    if (newOpen) {
                      setOpenContextMenuRowIdx(rowIdx);
                    } else {
                      setOpenContextMenuRowIdx(-1);
                    }
                  }}
                  maxHeight='400px'
                  anchorEl={anchorEl}
                  open={openContextMenuRowIdx === rowIdx}
                />
              );
            }
            return (
              <StyledDivValueCell {...cell.getCellProps()}>
                {dropdownContent}
                {cell.render('Cell')}
              </StyledDivValueCell>
            );
          })}
        </StyledDivContentRow>
      );
    } catch(err){
      return <StyledDivContentRow
        key={key}
        data-row-idx={rowIdx}>
          Loading...
        </StyledDivContentRow>
    }
  };

  const rowHeight = tableCellHeight;
  const totalHeight = rowHeight * data.length;
  const height = totalHeight;
  const width = tableCellWidth * columns.length;

  useEffect(() => {
    document.querySelector('#MainPage__RightPane')?.addEventListener(
      'scroll',
      (e) => {
        let newScrollTop = (e.target as HTMLElement)?.scrollTop || 0;

        function findOffsetRelativeToAncestor(element, ancestor) {
          let offset = 0;
          let currentElement = element;

          while (currentElement && currentElement !== ancestor) {
            offset += currentElement.offsetTop;
            currentElement = currentElement.offsetParent;
          }

          return offset;
        }
        document.querySelector('.ReactVirtualized__Grid');

        var element = document.querySelector('.ReactVirtualized__Grid');
        var ancestor = document.querySelector('#MainPage__RightPane');

        var yOffset = findOffsetRelativeToAncestor(element, ancestor);

        console.log(newScrollTop, newScrollTop - yOffset);
        newScrollTop = newScrollTop - yOffset

        setScrollTop(newScrollTop)
      }
    )
  }, [])

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          {props.searchInputId && (
            <GlobalFilter id={props.searchInputId} onChange={setGlobalFilter} />
          )}
        </Box>
        {!fullScreen && (
          <Tooltip title='Open this table fullscreen in another window'>
            <IconButton aria-label='Make table bigger' onClick={onShowExpandedData}>
              <ZoomOutMapIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {headerGroups.map((headerGroup, headerGroupIdx) => (
        <StyledDivHeaderRow {...headerGroup.getHeaderGroupProps()}>
          {headerGroup.headers.map((column, colIdx) => (
            <StyledDivHeaderCell {...column.getHeaderProps()}>
              <StyledDivHeaderCellLabel {...column.getSortByToggleProps()}>
                <span>{column.render('Header')}</span>
                {column.isSorted &&
                  (column.isSortedDesc ? (
                    <ArrowDropDownIcon fontSize='small' />
                  ) : (
                    <ArrowDropUpIcon fontSize='small' />
                  ))}
                {/* Render the column resize handler */}
              </StyledDivHeaderCellLabel>
              {column.canFilter && column.Header && (
                <Box sx={{ mt: 1 }}>{column.render('Filter')}</Box>
              )}
              {column.canResize && (
                <ColumnResizer
                  {...column.getResizerProps()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              )}
            </StyledDivHeaderCell>
          ))}
        </StyledDivHeaderRow>
      ))}
      <List
        width={width}
        height={height}
        rowCount={data.length}
        rowHeight={rowHeight}
        rowRenderer={rowRenderer}
        scrollTop={scrollTop}
        overscanRowCount={5}
      />
      {!page ||
        (page.length === 0 && (
          <Box sx={{ paddingInline: 2, paddingBlock: 2 }}>
            There is no data in the query with matching filters.
          </Box>
        ))}
    </>
  );
}
