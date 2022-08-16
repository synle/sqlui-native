import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getDatabaseActions } from 'src/common/adapters/DataScriptFactory';
import DropdownButton from 'src/frontend/components/DropdownButton';
import { useCommands } from 'src/frontend/components/MissionControl';
import { useGetConnectionById } from 'src/frontend/hooks/useConnection';
import { useActiveConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';
import { useQuerySizeSetting } from 'src/frontend/hooks/useSetting';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import { SqlAction } from 'typings';

type DatabaseActionsProps = {
  connectionId: string;
  databaseId: string;
};

export default function DatabaseActions(props: DatabaseActionsProps): JSX.Element | null {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const querySize = useQuerySizeSetting();
  let databaseId: string | undefined = props.databaseId;
  let connectionId: string | undefined = props.connectionId;
  const { selectCommand } = useCommands();
  const { data: treeActions } = useTreeActions();

  if (!open) {
    // if table action is not opened, hen we don't need to do this...
    databaseId = undefined;
    connectionId = undefined;
  }

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { query } = useActiveConnectionQuery();
  const dialect = connection?.dialect;

  const isLoading = loadingConnection;

  let actions: SqlAction.Output[] = [];

  actions = [
    {
      label: 'Select',
      description: `Selected the related database and connection.`,
      icon: <SelectAllIcon />,
    },
  ];

  // TODO: move this into the interface of script adapter
  // supportVisualization
  switch (dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'postgresql':
    case 'sqlite':
      actions.push({
        label: 'Visualize',
        description: `Visualize all tables in this database.`,
        icon: <SsidChartIcon />,
        //@ts-ignore
        onClick: () => navigate(`/relationship/${connectionId}/${databaseId}`),
      });
      break;
  }

  actions = [
    ...actions,
    ...getDatabaseActions({
      dialect,
      connectionId,
      databaseId,
      querySize,
    }),
  ];

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () =>
      //@ts-ignore
      action?.onClick
        ? //@ts-ignore
          action.onClick()
        : selectCommand({
            event: 'clientEvent/query/apply',
            data: {
              connectionId,
              databaseId,
              tableId: '',
              sql: action.query,
            },
            label: action.description || `Applied "${action.label}" to active query tab.`,
          }),
  }));

  if (!treeActions.showContextMenu) {
    return null;
  }

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
