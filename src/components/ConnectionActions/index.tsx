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
import { useCommands } from 'src/components/MissionControl';
import Toast from 'src/components/Toast';
import { downloadText } from 'src/data/file';
import { useActionDialogs } from 'src/hooks/useActionDialogs';
import { useDeleteConnection } from 'src/hooks/useConnection';
import { useDuplicateConnection } from 'src/hooks/useConnection';
import { useRetryConnection } from 'src/hooks/useConnection';
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
  const { selectCommand } = useCommands()
  const data = connection;

  const options = [
    {
      label: 'Select',
      startIcon: <SelectAllIcon />,
      onClick: () => selectCommand({
        event: 'clientEvent/connection/select',
        data,
      }),
    },
    {
      label: 'Edit',
      startIcon: <EditIcon />,
      onClick: () => navigate(`/connection/edit/${connection.id}`),
    },
    {
      label: 'Export',
      startIcon: <ArrowUpwardIcon />,
      onClick: () => selectCommand({
        event: 'clientEvent/connection/export',
        data,
      }),
    },
    {
      label: 'Duplicate',
      startIcon: <ContentCopyIcon />,
      onClick: () => selectCommand({
        event: 'clientEvent/connection/duplicate',
        data,
      }),
    },
    {
      label: 'Refresh',
      startIcon: <RefreshIcon />,
      onClick: () => selectCommand({
        event: 'clientEvent/connection/refresh',
        data,
      }),
    },
    {
      label: 'Delete',
      startIcon: <DeleteIcon />,
      onClick: () => selectCommand({
        event: 'clientEvent/connection/delete',
        data,
      }),
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
