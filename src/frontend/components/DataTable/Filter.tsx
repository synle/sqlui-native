import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { Column } from "@tanstack/react-table";

export function GlobalFilter(props: any) {
  return (
    <TextField
      id={props.id}
      label="Search Table"
      size="small"
      variant="outlined"
      fullWidth
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

type SimpleColumnFilterProps = {
  column: Column<any, unknown>;
};

export function SimpleColumnFilter({ column }: SimpleColumnFilterProps) {
  const filterValue = (column.getFilterValue() as string) ?? "";
  const facetedValues = column.getFacetedUniqueValues();

  const options = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    facetedValues.forEach((_count, val) => {
      if (count >= 100) return;
      if (val != null && val !== "") {
        seen.add(String(val));
        count++;
      }
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [facetedValues]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      value={filterValue}
      onInputChange={(_e, newValue) => column.setFilterValue(newValue || undefined)}
      filterOptions={(opts, state) => {
        const input = state.inputValue.toLowerCase();
        if (!input) return opts;
        return opts.filter((opt) => opt.toLowerCase().includes(input));
      }}
      renderInput={(params) => <TextField {...params} size="small" placeholder="Filter" />}
      size="small"
    />
  );
}
