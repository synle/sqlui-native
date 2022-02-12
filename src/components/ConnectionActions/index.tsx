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
import useToaster from 'src/hooks/useToaster';

interface ConnectionActionsProps {
  connection: SqluiCore.ConnectionProps;
}

export default function ConnectionActions(props: ConnectionActionsProps) {
  const { connection } = props;
  const navigate = useNavigate();
  const { mutateAsync: deleteConnection } = useDeleteConnection();
  const { mutateAsync: reconnectConnection } = useRetryConnection();
  const { mutateAsync: duplicateConnection } = useDuplicateConnection();
  const { confirm } = useActionDialogs();
  const { onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const { add: addToast, dismiss: dismissToast } = useToaster();

  const onDelete = async () => {
    try {
      await confirm('Delete this connection?');
      await deleteConnection(connection.id);
      await addToast({
        message: `Connection "${connection.name}" deleted`,
      });
    } catch (err) {
      await addToast({
        message: `Failed to delete connection "${connection.name}"`,
      });
    }

    await dismissToast(2000);
  };

  const onRefresh = async () => {
    await addToast({
      message: `Refreshing connection "${connection.name}", please wait...`,
    });

    let resultMessage = '';
    try {
      await reconnectConnection(connection.id);
      resultMessage = `Successfully refreshed connection`;
    } catch (err) {
      resultMessage = `Failed to refresh connection`;
    }

    await dismissToast();
    await addToast({
      message: resultMessage,
    });

    await dismissToast(3000);
  };

  const onDuplicate = async () => {
    await addToast({
      message: `Duplicating connection "${connection.name}", please wait...`,
    });

    duplicateConnection(connection);

    await dismissToast(2000);
  };

  const onExportConnection = async () => {
    await addToast({
      message: `Exporting connection "${connection.name}", please wait...`,
    });

    downloadText(
      `${connection.name}.connection.json`,
      JSON.stringify([getExportedConnection(connection)], null, 2),
      'text/json',
    );

    await dismissToast(2000);
  };

  const onSelectConnection = async () => {
    await addToast({
      message: `Connection "${connection.name}" selected for query`,
    });

    onChangeActiveQuery({
      connectionId: connection.id,
      databaseId: '',
    });

    await dismissToast(2000);
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
    </>
  );
}
