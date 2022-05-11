import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';
import { getDatabaseActions } from 'src/common/adapters/DataScriptFactory';
import DropdownButton from 'src/frontend/components/DropdownButton';
import { useCommands } from 'src/frontend/components/MissionControl';
import { useGetConnectionById } from 'src/frontend/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';
import { useQuerySizeSetting } from 'src/frontend/hooks/useSetting';
import { SqlAction } from 'typings';

type DatabaseActionsProps = {
  connectionId: string;
  databaseId: string;
};

export default function DatabaseActions(props: DatabaseActionsProps) {
  const [open, setOpen] = useState(false);
  const querySize = useQuerySizeSetting();
  let databaseId: string | undefined = props.databaseId;
  let connectionId: string | undefined = props.connectionId;
  const { selectCommand } = useCommands();

  if (!open) {
    // if table action is not opened, hen we don't need to do this...
    databaseId = undefined;
    connectionId = undefined;
  }

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { query } = useActiveConnectionQuery();
  const dialect = connection?.dialect;

  const isLoading = loadingConnection;

  let actions: SqlAction.Output[] = getDatabaseActions({
    dialect,
    connectionId,
    databaseId,
    querySize,
  });

  actions = [
    {
      label: 'Select',
      description: `Selected the related database and connection.`,
      icon: <SelectAllIcon />,
    },
    ...actions,
  ];

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () =>
      selectCommand({
        event: 'clientEvent/query/apply',
        data: {
          connectionId: connectionId,
          databaseId: databaseId,
          sql: action.query,
        },
        label: action.description || `Applied "${action.label}" to active query tab.`,
      }),
  }));

  return (
    <div className='DatabaseActions'>
      <DropdownButton
        id='database-action-split-button'
        options={options}
        onToggle={(newOpen) => setOpen(newOpen)}
        isLoading={isLoading}>
        <IconButton aria-label='Database Actions' size='small' color='inherit'>
          <ArrowDropDownIcon fontSize='inherit' color='inherit' />
        </IconButton>
      </DropdownButton>
    </div>
  );
}
