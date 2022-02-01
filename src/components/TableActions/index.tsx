import React, { useState } from 'react';
import { format } from 'sql-formatter';
import Typography from '@mui/material/Typography';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {
  useGetColumns,
  useShowHide,
  useGetConnectionById,
  useActiveConnectionQuery,
} from 'src/hooks';
import DropdownButton from 'src/components/DropdownButton';
import { getTableActions } from 'src/data/sql';
import { SqluiCore } from 'typings';

type TableActionsProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function TableActions(props: TableActionsProps) {
  const [open, setOpen] = useState(false);
  const { databaseId, connectionId, tableId } = props;
  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { data: columns, isLoading: loadingColumns } = !open
    ? useGetColumns(undefined, undefined, undefined)
    : useGetColumns(connectionId, databaseId, tableId);

  const { query, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const dialect = connection?.dialect;

  const isLoading = loadingConnection || loadingColumns;

  const actions = getTableActions({
    dialect,
    connectionId,
    databaseId,
    tableId,
    columns: columns || [],
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
    onClick: () => action.query && onShowQuery(format(action.query)),
  }));

  return (
    <div className='TableActions'>
      <DropdownButton
        id='table-action-split-button'
        options={options}
        onToggle={(newOpen) => setOpen(newOpen)}
        isLoading={isLoading}>
        <IconButton aria-label='Table Actions' size='small'>
          <ArrowDropDownIcon fontSize='inherit' />
        </IconButton>
      </DropdownButton>
    </div>
  );
}
