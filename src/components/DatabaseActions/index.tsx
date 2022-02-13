import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';
import DropdownButton from 'src/components/DropdownButton';
import { useCommands } from 'src/components/MissionControl';
import { getDatabaseActions } from 'src/data/sql';
import { useGetConnectionById } from 'src/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/hooks/useConnectionQuery';
import { useQuerySizeSetting } from 'src/hooks/useSetting';
import useToaster from 'src/hooks/useToaster';

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

  const actions = getDatabaseActions({
    dialect,
    connectionId,
    databaseId,
    querySize,
  });

  const options = [
    {
      label: 'Select',
      startIcon: <SelectAllIcon />,
      onClick: () =>
        selectCommand({
          event: 'clientEvent/query/changeActiveQuery',
          data: {
            connectionId: connectionId,
            databaseId: databaseId,
          },
        }),
    },
    ...actions.map((action) => ({
      label: action.label,
      onClick: async () => action.query && selectCommand({
            event: 'clientEvent/query/changeActiveQuery',
            data: {
              connectionId: connectionId,
              databaseId: databaseId,
              sql: action.query,
            },
            label: `Applied "${action.label}" to active query tab.`
          }),
    })),
  ];

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
