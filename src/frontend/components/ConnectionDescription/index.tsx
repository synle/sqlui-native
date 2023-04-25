import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import React from 'react';
import { AccordionBody, AccordionHeader } from 'src/frontend/components/Accordion';
import ConnectionActions from 'src/frontend/components/ConnectionActions';
import ConnectionRetryAlert from 'src/frontend/components/ConnectionRetryAlert';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';
import DatabaseDescription from 'src/frontend/components/DatabaseDescription';
import { useGetConnections, useUpdateConnections } from 'src/frontend/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';
import { useShowHide } from 'src/frontend/hooks/useShowHide';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();
  const { query: activeQuery } = useActiveConnectionQuery();
  const { mutateAsync: updateConnections } = useUpdateConnections(connections);

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

  const onConnectionOrderChange = (fromIdx: number, toIdx: number) => {
    updateConnections([fromIdx, toIdx]);
  };

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
              className={isSelected ? 'selected ConnectionDescription' : 'ConnectionDescription'}
              onOrderChange={onConnectionOrderChange}>
              <ConnectionTypeIcon dialect={connection.dialect} status={connection.status} />
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
