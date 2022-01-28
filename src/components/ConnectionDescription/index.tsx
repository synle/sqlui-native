import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import CloudIcon from '@mui/icons-material/Cloud';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import { Button } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DatabaseDescription from 'src/components/DatabaseDescription';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import ColumnDescription from 'src/components/ColumnDescription';
import TableActions from 'src/components/TableActions';
import DropdownButton from 'src/components/DropdownButton';
import { useActionDialogs } from 'src/components/ActionDialogs';
import { useRetryConnection, useGetMetaData, useShowHide, useDeleteConnection } from 'src/hooks';
import { Sqlui } from 'typings';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetMetaData();
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections || connections.length === 0) {
    return <Alert severity='info'>No connnections</Alert>;
  }

  return (
    <div className='ConnectionDescription'>
      {connections.map((connection) => {
        const key = [connection.id].join(' > ');
        const isOnline = connection?.status === 'online';

        return (
          <React.Fragment key={key}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <CloudIcon color={isOnline ? 'primary' : 'disabled'} fontSize='inherit' />
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
    </div>
  );
}

// TODO: move this into a file if we need to reuse it
interface ConnectionRetryAlertProps {
  connectionId: string;
}

function ConnectionRetryAlert(props: ConnectionRetryAlertProps) {
  const { connectionId } = props;
  const [retrying, setRetrying] = useState(false);
  const { mutateAsync: reconnectConnection, isLoading: reconnecting } = useRetryConnection();

  const onReconnect = async (connectionId: string) => {
    setRetrying(true);
    try {
      await reconnectConnection(connectionId);
      setRetrying(false);
    } catch (err) {
      setRetrying(false);
    }
  };

  if (retrying) {
    return <Alert severity='info'>Connecting to server. Please wait....</Alert>;
  }

  return (
    <Alert
      severity='error'
      action={
        <Button color='inherit' size='small' onClick={() => onReconnect(connectionId)}>
          Reconnect
        </Button>
      }>
      Can't connect to this server
    </Alert>
  );
}

// TOD:
interface ConnectionActionsProps {
  connection: Sqlui.ConnectionMetaData;
}
function ConnectionActions(props: ConnectionActionsProps) {
  const { connection } = props;
  const navigate = useNavigate();
  const { mutateAsync: deleteConnection } = useDeleteConnection();
  const { confirm } = useActionDialogs();

  const onDelete = async () => {
    await confirm('Delete this connection?');
    await deleteConnection(connection.id);
  };

  const options = [
    {
      label: 'Edit',
      onClick: () => navigate(`/connection/edit/${connection.id}`),
    },
    {
      label: 'Delete',
      onClick: onDelete,
    },
  ];

  return (
    <DropdownButton id='connection-actions-split-button' options={options}>
      <IconButton aria-label='Connection Actions' size='small'>
        <ArrowDropDownIcon fontSize='inherit' />
      </IconButton>
    </DropdownButton>
  );
}
