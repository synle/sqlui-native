import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CloudIcon from '@mui/icons-material/Cloud';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import Alert from '@mui/material/Alert';
import { Button } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import DatabaseDescription from 'src/components/DatabaseDescription';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import ColumnDescription from 'src/components/ColumnDescription';
import TableActions from 'src/components/TableActions';
import DropdownButton from 'src/components/DropdownButton';
import { useActionDialogs } from 'src/components/ActionDialogs';
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
    return <Alert severity='info'>Loading...</Alert>;
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
              <ConnectionDialectIcon connection={connection} />
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
interface ConnectionDialectIconProps {
  connection: SqluiCore.ConnectionProps;
}
function ConnectionDialectIcon(props: ConnectionDialectIconProps) {
  const { dialect, status } = props.connection;

  if (status !== 'online') {
    return <CloudIcon color='disabled' fontSize='inherit' />;
  }

  switch (dialect) {
    case 'mssql':
      return (
        <img src={`${process.env.PUBLIC_URL}/assets/sqlserver.png`} title={dialect} width={30} />
      );
    case 'postgres':
      return (
        <img src={`${process.env.PUBLIC_URL}/assets/postgresql.png`} title={dialect} width={30} />
      );
    case 'sqlite':
      return <img src={`${process.env.PUBLIC_URL}/assets/sqlite.png`} title={dialect} width={30} />;
    case 'mariadb':
      return (
        <img src={`${process.env.PUBLIC_URL}/assets/mariadb.png`} title={dialect} width={30} />
      );
    case 'mysql':
      return <img src={`${process.env.PUBLIC_URL}/assets/mysql.png`} title={dialect} width={30} />;
    default:
      return <CloudIcon color='primary' fontSize='inherit' />;
  }
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
    onChangeActiveQuery('lastExecuted', undefined); // this is to stop the query from automatically triggered
    onChangeActiveQuery('connectionId', connection.id);
    onChangeActiveQuery('databaseId', undefined);
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
        <IconButton aria-label='Connection Actions' size='small'>
          <ArrowDropDownIcon fontSize='inherit' />
        </IconButton>
      </DropdownButton>
      <Toast open={!!message} onClose={() => setMessage('')} message={message} />
    </>
  );
}
