import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';
import DropdownButton from 'src/components/DropdownButton';
import { getDatabaseActions } from 'src/data/sql';
import { useActiveConnectionQuery } from 'src/hooks';
import { useGetConnectionById } from 'src/hooks';
import { useQuerySizeSetting } from 'src/hooks';
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
  const { add: addToast } = useToaster();

  if (!open) {
    // if table action is not opened, hen we don't need to do this...
    databaseId = undefined;
    connectionId = undefined;
  }

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { query, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const dialect = connection?.dialect;

  const isLoading = loadingConnection;

  const actions = getDatabaseActions({
    dialect,
    connectionId,
    databaseId,
    querySize,
  });

  const onSelectDatabaseForQuery = () => {
    onChangeActiveQuery({
      connectionId: connectionId,
      databaseId: databaseId,
    });
  };

  const onShowQuery = (queryToShow: string) => {
    onChangeActiveQuery({
      connectionId: connectionId,
      databaseId: databaseId,
      sql: queryToShow,
    });
  };

  const options = [
    {
      label: 'Select',
      onClick: onSelectDatabaseForQuery,
      startIcon: <SelectAllIcon />,
    },
    ...actions.map((action) => ({
      label: action.label,
      onClick: async () => {
        if (action.query) {
          const curToast = await addToast({
            message: `Applied "${action.label}" query`,
          });

          onShowQuery(action.query);
        }
      },
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
