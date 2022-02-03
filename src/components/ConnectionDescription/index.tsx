import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Button } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import List from '@mui/material/List';
import DatabaseDescription from 'src/components/DatabaseDescription';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import ColumnDescription from 'src/components/ColumnDescription';
import TableActions from 'src/components/TableActions';
import DropdownButton from 'src/components/DropdownButton';
import { useActionDialogs } from 'src/components/ActionDialogs';
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
import { SqluiCore } from 'typings';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();

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
    <div className='ConnectionDescription'>
      {connections.map((connection) => {
        const key = [connection.id].join(' > ');
        const isOnline = connection?.status === 'online';

        return (
          <React.Fragment key={key}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
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

// TODO: move this into a file if we need to reuse it
interface ConnectionActionsProps {
  connection: SqluiCore.ConnectionProps;
}
function ConnectionActions(props: ConnectionActionsProps) {
  const { connection } = props;
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { mutateAsync: deleteConnection } = useDeleteConnection();
  const { mutateAsync: reconnectConnection } = useRetryConnection();
  const { mutateAsync: duplicateConnection } = useDuplicateConnection();
  const { confirm } = useActionDialogs();
  const { onChange: onChangeActiveQuery } = useActiveConnectionQuery();

  const onDelete = async () => {
    try {
      await confirm('Delete this connection?');
      await deleteConnection(connection.id);
    } catch (err) {
      //@ts-ignore
    }
  };

  const onRefresh = async () => {
    try {
      await reconnectConnection(connection.id);
      setMessage('Successfully refreshed connection');
    } catch (err) {
      setMessage('Failed to refresh connection');
    }
  };

  const onDuplicate = async () => {
    duplicateConnection(connection);
  };

  const onExportConnection = () => {
    downloadText(
      `${connection.name}.connection.json`,
      JSON.stringify([getExportedConnection(connection)], null, 2),
      'text/json',
    );
  };

  const onSelectConnection = () => {
    onChangeActiveQuery({
      connectionId: connection.id,
      databaseId: '',
    });
  };

  const options = [
    {
      label: 'Select',
      onClick: () => onSelectConnection(),
      startIcon: <SelectAllIcon />,
    },
    {
      label: 'Edit',
      onClick: () => navigate(`/connection/edit/${connection.id}`),
      startIcon: <EditIcon />,
    },
    {
      label: 'Export',
      onClick: onExportConnection,
      startIcon: <ArrowUpwardIcon />,
    },
    {
      label: 'Duplicate',
      onClick: onDuplicate,
      startIcon: <ContentCopyIcon />,
    },
    {
      label: 'Refresh',
      onClick: onRefresh,
      startIcon: <RefreshIcon />,
    },
    {
      label: 'Delete',
      onClick: onDelete,
      startIcon: <DeleteIcon />,
    },
  ];

  return (
    <>
      <DropdownButton id='connection-actions-split-button' options={options}>
        <IconButton aria-label='Connection Actions' size='small' color='inherit'>
          <ArrowDropDownIcon fontSize='inherit' color='inherit' />
        </IconButton>
      </DropdownButton>
      <Toast open={!!message} onClose={() => setMessage('')} message={message} />
    </>
  );
}
