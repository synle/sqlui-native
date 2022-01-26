import React from 'react';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
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
    return <>No Data</>;
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
        const key = JSON.stringify({ ...props, database: database.name });
        return (
          <React.Fragment key={database.name}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <LibraryBooksIcon />
              <span>{database.name}</span>
              <SelectAllIcon onClick={(e) => onSelectDatabaseForQuery(e, database.name)} />
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
