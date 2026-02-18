import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import React, { useMemo } from 'react';

export function GlobalFilter(props: any) {
  return (
    <TextField
      id={props.id}
      label='Search Table'
      size='small'
      variant='standard'
      sx={{ mb: 2 }}
      fullWidth
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}
// default filter (using text)
type SimpleColumnFilterProps = {
  column: {
    filterValue?: string;
    setFilter: (newFilterValue: string | undefined) => void;
    preFilteredRows?: any[];
    id?: string;
  };
};

export function SimpleColumnFilter({
  column: { filterValue, setFilter, preFilteredRows, id },
}: SimpleColumnFilterProps) {
  const ROWS_TO_SCAN = 1000;
  const options = useMemo(() => {
    if (!preFilteredRows || !id) return [];
    const seen = new Set<string>();
    const rowsToScan = preFilteredRows.slice(0, 100);
    for (const row of rowsToScan) {
      const val = row.values[id];
      if (val != null && val !== '') {
        seen.add(String(val));
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [preFilteredRows, id]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      value={filterValue || ''}
      onInputChange={(_e, newValue) => setFilter(newValue || undefined)}
      filterOptions={(opts, state) => {
        const input = state.inputValue.toLowerCase();
        if (!input) return opts;
        return opts.filter((opt) => opt.toLowerCase().includes(input));
      }}
      renderInput={(params) => (
        <TextField {...params} size='small' placeholder='Filter' />
      )}
      size='small'
    />
  );
}
