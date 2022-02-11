import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { Button } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { downloadText } from 'src/data/file';
import { getExportedConnection } from 'src/hooks';
import { SqluiCore } from 'typings';
import { useActionDialogs } from 'src/hooks/useActionDialogs';
import { useActiveConnectionQuery } from 'src/hooks';
import { useDeleteConnection } from 'src/hooks';
import { useDuplicateConnection } from 'src/hooks';
import { useRetryConnection } from 'src/hooks';
import DropdownButton from 'src/components/DropdownButton';
import Toast from 'src/components/Toast';

interface ConnectionActionsProps {
  connection: SqluiCore.ConnectionProps;
}

export default function ConnectionActions(props: ConnectionActionsProps) {
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
    } catch (err) {}
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
