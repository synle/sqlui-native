import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import React from 'react';
import { AccordionBody } from 'src/components/Accordion';
import { AccordionHeader } from 'src/components/Accordion';
import { useActiveConnectionQuery } from 'src/hooks';
import { useGetDatabases } from 'src/hooks';
import { useShowHide } from 'src/hooks';
import DatabaseActions from 'src/components/DatabaseActions';
import TableDescription from 'src/components/TableDescription';

type DatabaseDescriptionProps = {
  connectionId: string;
};

export default function DatabaseDescription(props: DatabaseDescriptionProps) {
  const { connectionId } = props;
  const { data: databases, isLoading, isError } = useGetDatabases(connectionId);
  const { visibles, onToggle } = useShowHide();
  const { query: activeQuery } = useActiveConnectionQuery();

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (isError) {
    return <Alert severity='error'>Error...</Alert>;
  }

  if (!databases || databases.length === 0) {
    return <Alert severity='warning'>Not Available</Alert>;
  }

  return (
    <>
      {databases.map((database) => {
        const key = [connectionId, database.name].join(' > ');
        const isSelected =
          activeQuery?.connectionId === connectionId && activeQuery?.databaseId === database.name;

        return (
          <React.Fragment key={database.name}>
            <AccordionHeader
              expanded={visibles[key]}
              onToggle={() => onToggle(key)}
              className={isSelected ? 'selected DatabaseDescription' : 'DatabaseDescription'}>
              <LibraryBooksIcon color='secondary' fontSize='inherit' />
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
