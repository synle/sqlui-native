import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import {
  getTableActions,
  isDialectSupportVisualization,
} from 'src/common/adapters/DataScriptFactory';
import DropdownButton from 'src/frontend/components/DropdownButton';
import { useCommands } from 'src/frontend/components/MissionControl';
import { useGetColumns, useGetConnectionById } from 'src/frontend/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';
import { useQuerySizeSetting } from 'src/frontend/hooks/useSetting';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import { SqlAction } from 'typings';

type TableActionsProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function TableActions(props: TableActionsProps): JSX.Element | null {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const querySize = useQuerySizeSetting();
  let databaseId: string | undefined = props.databaseId;
  let connectionId: string | undefined = props.connectionId;
  let tableId: string | undefined = props.tableId;
  const { selectCommand } = useCommands();
  const { data: treeActions } = useTreeActions();

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

  const isLoading = loadingConnection || loadingColumns;

  let actions: SqlAction.Output[] = [];

  if (isDialectSupportVisualization(dialect)) {
    actions = [
      ...actions,
      {
        label: 'Visualize',
        description: `Visualize all tables in this database.`,
        icon: <SsidChartIcon />,
        onClick: () => navigate(`/relationship/${connectionId}/${databaseId}/${tableId}`),
      },
      getDivider(),
    ];
  }

  actions = [
    ...actions,
    ...getTableActions({
      dialect,
      connectionId,
      databaseId,
      tableId,
      columns: columns || [],
      querySize,
    }),
  ];

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () =>
      action?.onClick
        ? action.onClick()
        : action.query &&
          selectCommand({
            event: 'clientEvent/query/apply',
            data: {
              connectionId,
              databaseId,
              tableId: tableId,
              sql: action.query,
            },
            label: `Applied "${action.label}" to active query tab.`,
          }),
  }));

  if (!treeActions.showContextMenu) {
    return null;
  }

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
