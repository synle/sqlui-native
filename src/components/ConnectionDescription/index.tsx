import React from 'react';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import CloudIcon from '@mui/icons-material/Cloud';
import IconButton from '@mui/material/IconButton';
import DatabaseDescription from 'src/components/DatabaseDescription';
import DeleteConnectionButton from 'src/components/DeleteConnectionButton';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetMetaData, useShowHide } from 'src/hooks';

export default function ConnectionDescription() {
  const navigate = useNavigate();
  const { data: connections, isLoading } = useGetMetaData();
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections || connections.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='ConnectionDescription'>
      {connections.map((connection) => {
        const key = [connection.id].join(' > ');

        return (
          <React.Fragment key={key}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <CloudIcon />
              <span>{connection.name}</span>
              <IconButton
                aria-label='Edit Connection'
                onClick={() => navigate(`/connection/edit/${connection.id}`)}>
                <EditIcon />
              </IconButton>
              <DeleteConnectionButton connectionId={connection.id} />
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <DatabaseDescription connectionId={connection.id} />
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </div>
  );
}
