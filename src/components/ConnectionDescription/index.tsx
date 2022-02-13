import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import React from 'react';
import { AccordionBody } from 'src/components/Accordion';
import { AccordionHeader } from 'src/components/Accordion';
import ConnectionActions from 'src/components/ConnectionActions';
import ConnectionRetryAlert from 'src/components/ConnectionRetryAlert';
import ConnectionTypeIcon from 'src/components/ConnectionTypeIcon';
import DatabaseDescription from 'src/components/DatabaseDescription';
import { useGetConnections } from 'src/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/hooks/useConnectionQuery';
import { useShowHide } from 'src/hooks/useShowHide';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();
  const { query: activeQuery } = useActiveConnectionQuery();

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading Connections...
      </Alert>
    );
  }

  if (!connections || connections.length === 0) {
    return <Alert severity='info'>No connnections</Alert>;
  }

  return (
    <>
      {connections.map((connection) => {
        const key = [connection.id].join(' > ');
        const isOnline = connection?.status === 'online';
        const isSelected = activeQuery?.connectionId && activeQuery?.connectionId === connection.id;

        return (
          <React.Fragment key={key}>
            <AccordionHeader
              expanded={visibles[key]}
              onToggle={() => onToggle(key)}
              className={isSelected ? 'selected ConnectionDescription' : 'ConnectionDescription'}>
              <ConnectionTypeIcon scheme={connection.dialect} status={connection.status} />
              <span>{connection.name}</span>
              <ConnectionActions connection={connection} />
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              {isOnline ? (
                <DatabaseDescription connectionId={connection.id} />
              ) : (
                <ConnectionRetryAlert connectionId={connection.id} />
              )}
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </>
  );
}
