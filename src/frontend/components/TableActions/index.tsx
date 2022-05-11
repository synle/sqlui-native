import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';
import {
  getIsTableIdRequiredForQuery,
  getTableActions,
} from 'src/common/adapters/DataScriptFactory';
import DropdownButton from 'src/frontend/components/DropdownButton';
import { useCommands } from 'src/frontend/components/MissionControl';
import { useGetColumns, useGetConnectionById } from 'src/frontend/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';
import { useQuerySizeSetting } from 'src/frontend/hooks/useSetting';

type TableActionsProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function TableActions(props: TableActionsProps) {
  const [open, setOpen] = useState(false);
  const querySize = useQuerySizeSetting();
  let databaseId: string | undefined = props.databaseId;
  let connectionId: string | undefined = props.connectionId;
  let tableId: string | undefined = props.tableId;
  const { selectCommand } = useCommands();

  if (!open) {
    // if table action is not opened, hen we don't need to do this...
    databaseId = undefined;
    connectionId = undefined;
    tableId = undefined;
  }

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(
    connectionId,
    databaseId,
    tableId,
  );

  const { query } = useActiveConnectionQuery();
  const dialect = connection?.dialect;

  const isTableIdRequiredForQuery = getIsTableIdRequiredForQuery(dialect);

  const isLoading = loadingConnection || loadingColumns;

  const actions = getTableActions({
    dialect,
    connectionId,
    databaseId,
    tableId,
    columns: columns || [],
    querySize,
  });

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () =>
      action.query &&
      selectCommand({
        event: 'clientEvent/query/apply',
        data: {
          connectionId: connectionId,
          databaseId: databaseId,
          tableId: isTableIdRequiredForQuery ? tableId : '',
          sql: action.query,
        },
        label: `Applied "${action.label}" to active query tab.`,
      }),
  }));

  return (
    <div className='TableActions'>
      <DropdownButton
        id='table-action-split-button'
        options={options}
        onToggle={(newOpen) => setOpen(newOpen)}
        isLoading={isLoading}>
        <IconButton aria-label='Table Actions' size='small' color='inherit'>
          <ArrowDropDownIcon fontSize='inherit' color='inherit' />
        </IconButton>
      </DropdownButton>
    </div>
  );
}
