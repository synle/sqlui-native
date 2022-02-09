import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Button } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import DatabaseDescription from 'src/components/DatabaseDescription';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import ColumnDescription from 'src/components/ColumnDescription';
import TableActions from 'src/components/TableActions';
import DropdownButton from 'src/components/DropdownButton';
import { useActionDialogs } from 'src/hooks/useActionDialogs';
import ConnectionTypeIcon from 'src/components/ConnectionTypeIcon';
import Toast from 'src/components/Toast';
import {
  useRetryConnection,
  useGetConnections,
  useShowHide,
  useDeleteConnection,
  useDuplicateConnection,
  getExportedConnection,
  useActiveConnectionQuery,
} from 'src/hooks';
import { downloadText } from 'src/data/file';
import ConnectionRetryAlert from 'src/components/ConnectionRetryAlert';
import ConnectionActions from 'src/components/ConnectionActions';
import { SqluiCore } from 'typings';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();
  const { query: activeQuery } = useActiveConnectionQuery();

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
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
      const isSelected = activeQuery?.connectionId === connection.id;

      return (
        <React.Fragment key={key}>
          <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)} className={isSelected ? 'selected ConnectionDescription' : 'ConnectionDescription'}>
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
