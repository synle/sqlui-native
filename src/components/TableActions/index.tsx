import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';
import { getTableActions } from 'src/data/sql';
import { useActiveConnectionQuery } from 'src/hooks';
import { useGetColumns } from 'src/hooks';
import { useGetConnectionById } from 'src/hooks';
import { useQuerySizeSetting } from 'src/hooks';
import DropdownButton from 'src/components/DropdownButton';
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

  if (!open) {
    // if tbale action is not opened, hen we don't need to do this...
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

  const { query, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const dialect = connection?.dialect;

  const isLoading = loadingConnection || loadingColumns;

  const actions = getTableActions({
    dialect,
    connectionId,
    databaseId,
    tableId,
    columns: columns || [],
    querySize,
  });

  const onShowQuery = (queryToShow: string) => {
    onChangeActiveQuery({
      connectionId: connectionId,
      databaseId: databaseId,
      sql: queryToShow,
    });
  };

  const options = actions.map((action) => ({
    label: action.label,
    onClick: () => {
      if (action.query) {
        onShowQuery(action.query);
      }
    },
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
