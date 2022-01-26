import React from 'react';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import CloudIcon from '@mui/icons-material/Cloud';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import { Button } from '@mui/material';
import DatabaseDescription from 'src/components/DatabaseDescription';
import DeleteConnectionButton from 'src/components/DeleteConnectionButton';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useAuthenticateConnection, useGetMetaData, useShowHide } from 'src/hooks';

export default function ConnectionDescription() {
  const navigate = useNavigate();
  const { data: connections, isLoading } = useGetMetaData();
  const { visibles, onToggle } = useShowHide();
  const { mutateAsync: reconnectConnection, isLoading: reconnecting } = useAuthenticateConnection();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections || connections.length === 0) {
    return <Alert severity='info'>No connnections</Alert>;
  }

  const onReconnect = async (connectionId: string) => reconnectConnection(connectionId);

  return (
    <div className='ConnectionDescription'>
      {connections.map((connection) => {
        const key = [connection.id].join(' > ');
        const isOnline = connection?.status === 'online';

        if (isOnline) {
          return (
            <React.Fragment key={key}>
              <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
                <CloudIcon color='primary' />
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
        }

        // offline
        return (
          <React.Fragment key={key}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <CloudIcon color='disabled' />
              <span>{connection.name}</span>
              <IconButton
                aria-label='Edit Connection'
                onClick={() => navigate(`/connection/edit/${connection.id}`)}>
                <EditIcon />
              </IconButton>
              <DeleteConnectionButton connectionId={connection.id} />
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
                <Alert
                  severity='error'
                  action={
                    <Button color='inherit' size='small' onClick={() => onReconnect(connection.id)}>
                      Reconnect
                    </Button>
                  }>
                  Can't connect to this server
                </Alert>
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </div>
  );
}
