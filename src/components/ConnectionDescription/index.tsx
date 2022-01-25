import React from 'react';
import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DatabaseDescription from 'src/components/DatabaseDescription';
import DeleteConnectionButton from 'src/components/DeleteConnectionButton';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetConnections, useShowHide } from 'src/hooks';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections || connections.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='ConnectionDescription'>
      {connections.map((connection) => (
        <React.Fragment key={connection.id}>
          <AccordionHeader
            expanded={visibles[connection.id]}
            onToggle={() => onToggle(connection.id)}>
            <span>{connection.name}</span>
            <Link to={`/connection/edit/${connection.id}`}>
              <EditIcon />
            </Link>
            <DeleteConnectionButton connectionId={connection.id} />
          </AccordionHeader>
          <AccordionBody expanded={visibles[connection.id]}>
            <DatabaseDescription connectionId={connection.id} />
          </AccordionBody>
        </React.Fragment>
      ))}
    </div>
  );
}
