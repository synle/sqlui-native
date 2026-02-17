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
} from 'src/frontend/components/DataTable/DataTableComponents';
import { GlobalFilter, SimpleColumnFilter } from 'src/frontend/components/DataTable/Filter';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useAddDataSnapshot } from 'src/frontend/hooks/useDataSnapshot';

export default function LegacyDataTable(props: DataTableProps): JSX.Element | null {
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
        width: tableCellWidthToUse,
      },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useBlockLayout,
    useResizeColumns,
  );

  const onRowContextMenuClick = (e: React.SyntheticEvent) => {
    const target = e.target as HTMLElement;
    const tr = target.closest('[role=row]') as HTMLElement;
    const rowIdx = parseInt(tr?.dataset?.rowIdx || '');

    if (rowIdx >= 0) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      setOpenContextMenuRowIdx(rowIdx);
      anchorEl.current = target;
    }
  };

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
      <Box sx={{ position: 'relative' }} onContextMenu={(e) => onRowContextMenuClick(e)}>
        {headerGroups.map((headerGroup) => (
          <StyledDivHeaderRow {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <StyledDivHeaderCell {...column.getHeaderProps()}>
                <StyledDivHeaderCellLabel {...column.getSortByToggleProps()}>
                  <span>{column.render('Header')}</span>
                  {column.isSorted &&
                    (column.isSortedDesc ? (
                      <ArrowDropDownIcon fontSize='small' />
                    ) : (
                      <ArrowDropUpIcon fontSize='small' />
                    ))}
                </StyledDivHeaderCellLabel>
                {column.canFilter && column.Header && (
                  <Box sx={{ mt: 1 }}>{column.render('Filter')}</Box>
                )}
                {column.canResize && (
                  <ColumnResizer
                    {...column.getResizerProps()}
                    isResizing={column.isResizing}
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
        {page.map((row, rowIdx) => {
          prepareRow(row);

          return (
            <StyledDivContentRow
              data-row-idx={rowIdx}
              sx={{
                cursor: props.onRowClick ? 'pointer' : '',
              }}
              onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}
              {...row.getRowProps()}>
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
        })}
        {page.length === 0 && (
          <Box sx={{ paddingInline: 2, paddingBlock: 2 }}>
            There is no data in the query with matching filters.
          </Box>
        )}
      </Box>
    </>
  );
}
