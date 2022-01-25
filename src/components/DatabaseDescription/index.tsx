import React from 'react';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import TableDescription from 'src/components/TableDescription';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetDatabases, useShowHide } from 'src/hooks';

type DatabaseDescriptionProps = {
  connectionId: string;
};

export default function DatabaseDescription(props: DatabaseDescriptionProps) {
  const { connectionId } = props;
  const { data: databases, isLoading } = useGetDatabases(connectionId);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!databases || databases.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='DatabaseDescription'>
      {databases.map((database) => {
        const key = JSON.stringify({ ...props, database: database.Name });
        return (
          <React.Fragment key={database.name}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <LibraryBooksIcon />
              <span>{database.name}</span>
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
