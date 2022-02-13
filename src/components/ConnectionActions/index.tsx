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
import DropdownButton from 'src/components/DropdownButton';
import Toast from 'src/components/Toast';
import { downloadText } from 'src/data/file';
import { useActionDialogs } from 'src/hooks/useActionDialogs';
import { useDeleteConnection } from 'src/hooks/useConnection';
import { useDuplicateConnection } from 'src/hooks/useConnection';
import { useRetryConnection } from 'src/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/hooks/useConnectionQuery';
import useToaster from 'src/hooks/useToaster';
import { createSystemNotification } from 'src/utils/commonUtils';
import { getExportedConnection } from 'src/utils/commonUtils';
import { SqluiCore } from 'typings';

type ConnectionActionsProps = {
  connection: SqluiCore.ConnectionProps;
};

export default function ConnectionActions(props: ConnectionActionsProps) {
  const { connection } = props;
  const navigate = useNavigate();
  const { mutateAsync: deleteConnection } = useDeleteConnection();
  const { mutateAsync: reconnectConnection } = useRetryConnection();
  const { mutateAsync: duplicateConnection } = useDuplicateConnection();
  const { confirm } = useActionDialogs();
  const { onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const { add: addToast } = useToaster();

  const onDelete = async () => {
    let curToast;
    try {
      await confirm('Delete this connection?');
      await deleteConnection(connection.id);
      curToast = await addToast({
        message: `Connection "${connection.name}" deleted`,
      });

      createSystemNotification(
        `Connection "${connection.name}" (dialect=${connection.dialect}) deleted`,
      );
    } catch (err) {
      curToast = await addToast({
        message: `Failed to delete connection "${connection.name}" (dialect=${connection.dialect})`,
      });
    }
  };

  const onRefresh = async () => {
    let curToast;

    curToast = await addToast({
      message: `Refreshing connection "${connection.name}", please wait...`,
    });

    let resultMessage = '';
    try {
      await reconnectConnection(connection.id);
      resultMessage = `Successfully connected to "${connection.name}" (dialect=${connection.dialect})`;
    } catch (err) {
      resultMessage = `Failed to connect to "${connection.name}"`;
    }

    await curToast.dismiss();
    curToast = await addToast({
      message: resultMessage,
    });

    createSystemNotification(resultMessage);
  };

  const onDuplicate = async () => {
    const curToast = await addToast({
      message: `Duplicating connection "${connection.name}", please wait...`,
    });

    duplicateConnection(connection);
  };

  const onExportConnection = async () => {
    const curToast = await addToast({
      message: `Exporting connection "${connection.name}", please wait...`,
    });

    downloadText(
      `${connection.name}.connection.json`,
      JSON.stringify([getExportedConnection(connection)], null, 2),
      'text/json',
    );
  };

  const onSelectConnection = async () => {
    const curToast = await addToast({
      message: `Connection "${connection.name}" selected for query`,
    });

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
    </>
  );
}
