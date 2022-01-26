import React from 'react';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import TableDescription from 'src/components/TableDescription';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetMetaData, useGetDatabases, useActiveConnectionQuery, useShowHide } from 'src/hooks';

type DatabaseDescriptionProps = {
  connectionId: string;
};

export default function DatabaseDescription(props: DatabaseDescriptionProps) {
  const { connectionId } = props;
  const { data: connections, isLoading } = useGetMetaData();
  const databases = useGetDatabases(connectionId, connections);
  const { query, onChange: onChangeQueryProp } = useActiveConnectionQuery();
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!databases || databases.length === 0) {
    return <Alert severity='info'>No Available</Alert>;
  }

  const onSelectDatabaseForQuery = async (e: React.SyntheticEvent, databaseId: string) => {
    e.preventDefault();
    e.stopPropagation();

    onChangeQueryProp('connectionId', connectionId);
    onChangeQueryProp('databaseId', databaseId);
  };

  return (
    <div className='DatabaseDescription'>
      {databases.map((database) => {
        const key = [connectionId, database.name].join(' > ');
        return (
          <React.Fragment key={database.name}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <LibraryBooksIcon color='secondary' />
              <span>{database.name}</span>
              <IconButton
                aria-label='Select Database For Execution'
                onClick={(e) => onSelectDatabaseForQuery(e, database.name)}>
                <SelectAllIcon />
              </IconButton>
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <TableDescription connectionId={connectionId} databaseId={database.name} />
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </div>
  );
}
