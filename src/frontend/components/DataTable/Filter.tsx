import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TextField from '@mui/material/TextField';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilters, useGlobalFilter, usePagination, useSortBy, useTable } from 'react-table';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DropdownButtonOption } from 'src/frontend/components/DropdownButton';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useTablePageSize } from 'src/frontend/hooks/useSetting';
import { sortColumnNamesForUnknownData } from 'src/frontend/utils/commonUtils';
import Chip from '@mui/material/Chip';


export function GlobalFilter(props: any){
  return <TextField
          id={props.id}
          label='Search Table'
          size='small'
          variant='standard'
          sx={{ mb: 2 }}
          fullWidth
          onChange={(e) => props.onChange(e.target.value)}
        />
}


// default filter (using text)
type SimpleColumnFilterProps = {
  column: {
    filterValue?: string;
    setFilter: (newFilterValue: string | undefined) => void;
  };
};

export function SimpleColumnFilter({
  column: { filterValue, setFilter },
}: SimpleColumnFilterProps) {
  return (
    <TextField
      size='small'
      placeholder='Filter'
      value={filterValue || ''}
      onChange={(e) => setFilter(e.target.value || undefined)}
    />
  );
}
