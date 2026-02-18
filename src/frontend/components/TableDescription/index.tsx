import TableRowsIcon from "@mui/icons-material/TableRows";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import React from "react";
import { AccordionBody, AccordionHeader } from "src/frontend/components/Accordion";
import ColumnDescription from "src/frontend/components/ColumnDescription";
import TableActions from "src/frontend/components/TableActions";
import { useGetTables } from "src/frontend/hooks/useConnection";
import { useShowHide } from "src/frontend/hooks/useShowHide";

type TableDescriptionProps = {
  connectionId: string;
  databaseId: string;
};

export default function TableDescription(props: TableDescriptionProps): JSX.Element | null {
  const { databaseId, connectionId } = props;
  const { data: tables, isLoading } = useGetTables(connectionId, databaseId);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!tables || tables.length === 0) {
    return <Alert severity="warning">Not Available</Alert>;
  }

  return (
    <>
      {tables.map((table) => {
        const key = [connectionId, databaseId, table.name].join(" > ");
        const isSelected = visibles[key];

        return (
          <React.Fragment key={table.name}>
            <AccordionHeader
              expanded={visibles[key]}
              onToggle={() => onToggle(key)}
              className={isSelected ? "selected TableDescription" : "TableDescription"}
            >
              <TableRowsIcon color="success" fontSize="inherit" />
              <span>{table.name}</span>
              <TableActions connectionId={connectionId} databaseId={databaseId} tableId={table.name} />
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <ColumnDescription connectionId={connectionId} databaseId={databaseId} tableId={table.name} />
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </>
  );
}
