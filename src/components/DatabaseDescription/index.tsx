import React from 'react';
import Typography from '@mui/material/Typography';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TableDescription from 'src/components/TableDescription';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetDatabases, useActiveConnectionQuery, useShowHide } from 'src/hooks';

type DatabaseDescriptionProps = {
  connectionId: string;
};

export default function DatabaseDescription(props: DatabaseDescriptionProps) {
  const { connectionId } = props;
  const { data: databases, isLoading, isError } = useGetDatabases(connectionId);
  const { query, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
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

  const onSelectDatabaseForQuery = async (e: React.SyntheticEvent, databaseId: string) => {
    e.preventDefault();
    e.stopPropagation();

    onChangeActiveQuery({
      connectionId: connectionId,
      databaseId: databaseId,
    });
  };

  return (
    <>
      {databases.map((database) => {
        const key = [connectionId, database.name].join(' > ');
        const isSelected = activeQuery?.databaseId === database.name;

        return (
          <React.Fragment key={database.name}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)} className={isSelected ? 'selected DatabaseDescription' : 'DatabaseDescription'}>
              <LibraryBooksIcon color='secondary' fontSize='inherit' />
              <span>{database.name}</span>
              <Tooltip title='Select Database For Execution'>
                <IconButton
                  aria-label='Select Database For Execution'
                  onClick={(e) => onSelectDatabaseForQuery(e, database.name)}
                  size='small'
                  color='inherit'>
                  <SelectAllIcon fontSize='inherit' />
                </IconButton>
              </Tooltip>
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
