import Table from '@mui/material/Table';
import TextField from '@mui/material/TextField';

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