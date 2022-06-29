import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import StarIcon from '@mui/icons-material/Star';
import { Button } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';
import { getConnectionActions } from 'src/common/adapters/DataScriptFactory';
import DropdownButton from 'src/frontend/components/DropdownButton';
import { useCommands } from 'src/frontend/components/MissionControl';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import { SqluiCore } from 'typings';

type ConnectionActionsProps = {
  connection: SqluiCore.ConnectionProps;
};

export default function ConnectionActions(props: ConnectionActionsProps) {
  const { connection } = props;
  const navigate = useNavigate();
  const { selectCommand } = useCommands();
  const data = connection;
  const { data: treeActions } = useTreeActions();

  const { dialect, id: connectionId } = connection;

  const options = [
    {
      label: 'Add to Bookmark',
      onClick: () =>
        selectCommand({
          event: 'clientEvent/connection/addToBookmark',
          data,
        }),
      startIcon: <StarIcon />,
    },
    { label: 'divider' },
    {
      label: 'Select',
      startIcon: <SelectAllIcon />,
      onClick: () =>
        selectCommand({
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
      onClick: () =>
        selectCommand({
          event: 'clientEvent/connection/export',
          data,
        }),
    },
    {
      label: 'Duplicate',
      startIcon: <ContentCopyIcon />,
      onClick: () =>
        selectCommand({
          event: 'clientEvent/connection/duplicate',
          data,
        }),
    },
    {
      label: 'Refresh',
      startIcon: <RefreshIcon />,
      onClick: () =>
        selectCommand({
          event: 'clientEvent/connection/refresh',
          data,
        }),
    },
    {
      label: 'Delete',
      startIcon: <DeleteIcon />,
      onClick: () =>
        selectCommand({
          event: 'clientEvent/connection/delete',
          data,
        }),
    },
    ...getConnectionActions({
      dialect,
      connectionId,
    }).map((action) => ({
      label: action.label,
      startIcon: action.icon,
      onClick: async () =>
        selectCommand({
          event: 'clientEvent/query/apply',
          data: {
            connectionId,
            databaseId: '',
            tableId: '',
            sql: action.query,
          },
          label: action.description || `Applied "${action.label}" to active query tab.`,
        }),
    })),
  ];

  if (!treeActions.showContextMenu) {
    return null;
  }

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
