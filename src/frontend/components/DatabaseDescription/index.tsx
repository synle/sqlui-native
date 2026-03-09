import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import React from "react";
import { AccordionBody, AccordionHeader } from "src/frontend/components/Accordion";
import DatabaseActions from "src/frontend/components/DatabaseActions";
import TableDescription from "src/frontend/components/TableDescription";
import { useGetDatabases } from "src/frontend/hooks/useConnection";
import { useActiveConnectionQuery } from "src/frontend/hooks/useConnectionQuery";
import { useShowHide } from "src/frontend/hooks/useShowHide";

/** Props for the DatabaseDescription component. */
type DatabaseDescriptionProps = {
  /** The ID of the connection whose databases to display. */
  connectionId: string;
};

/**
 * Renders an expandable list of databases for a given connection.
 * Each database can be expanded to show its tables via TableDescription.
 * @param props - Contains the connectionId to fetch databases for.
 * @returns A list of accordion sections for each database, or a loading/error alert.
 */
export default function DatabaseDescription(props: DatabaseDescriptionProps): JSX.Element | null {
  const { connectionId } = props;
  const { data: databases, isLoading, isError } = useGetDatabases(connectionId);
  const { visibles, onToggle } = useShowHide();
  const { query: activeQuery } = useActiveConnectionQuery();

  if (isLoading) {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (isError) {
    return <Alert severity="error">Error...</Alert>;
  }

  if (!databases || databases.length === 0) {
    return <Alert severity="warning">Not Available</Alert>;
  }

  return (
    <>
      {databases.map((database) => {
        const key = [connectionId, database.name].join(" > ");
        const isSelected = activeQuery?.connectionId === connectionId && activeQuery?.databaseId === database.name;

        return (
          <React.Fragment key={database.name}>
            <AccordionHeader
              expanded={visibles[key]}
              onToggle={() => onToggle(key)}
              className={isSelected ? "selected DatabaseDescription" : "DatabaseDescription"}
            >
              <LibraryBooksIcon color="secondary" fontSize="inherit" />
              <span>{database.name}</span>
              <DatabaseActions connectionId={connectionId} databaseId={database.name} />
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <TableDescription connectionId={connectionId} databaseId={database.name} />
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </>
  );
}
