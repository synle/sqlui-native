import React from 'react';
import Typography from '@mui/material/Typography';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Alert from '@mui/material/Alert';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import SplitButton from 'src/components/SplitButton';
import {
  useGetMetaData,
  useGetColumns,
  useShowHide,
  useGetConnection,
  useActiveConnectionQuery,
} from 'src/hooks';
import { Sqlui } from 'typings';

type TableActionsProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function TableActions(props: TableActionsProps) {
  const { databaseId, connectionId, tableId } = props;
  const { data: connections, isLoading } = useGetMetaData();
  const connection = useGetConnection(connectionId, connections);
  const columns = useGetColumns(connectionId, databaseId, tableId, connections);
  const { query, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const dialect = connection?.dialect;

  if (isLoading || !dialect || !connection || !columns || Object.keys(columns).length === 0) {
    return null;
  }

  const actions: TableActionOutput[] = [];
  const tableActionInput = { dialect, connectionId, databaseId, tableId, columns };

  let action;

  action = getSelectAllColumns(tableActionInput);
  action && actions.push(action);

  action = getSelectSpecificColumns(tableActionInput);
  action && actions.push(action);

  action = getInsertCommand(tableActionInput);
  action && actions.push(action);

  action = getUpdateCommand(tableActionInput);
  action && actions.push(action);

  const onShowQuery = (queryToShow: string) => {
    onChangeActiveQuery('connectionId', connectionId);
    onChangeActiveQuery('databaseId', databaseId);
    onChangeActiveQuery('sql', queryToShow);
  };

  const options = actions.map((action) => ({
    label: action.label,
    onClick: () => onShowQuery(action.query),
  }));

  return (
    <div className='TableActions'>
      <SplitButton id='table-action-split-button' label='Table Actions' options={options} />
    </div>
  );
}

// TODO: move me to a file
interface TableActionInput {
  dialect: string;
  connectionId: string;
  databaseId: string;
  tableId: string;
  columns: Sqlui.ColumnMetaData[];
}

type TableActionOutput = {
  label: string;
  query: string;
};

const QUERY_LIMIT = 10;

function getSelectAllColumns(input: TableActionInput): TableActionOutput | undefined {
  const label = `Select All Columns`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        query: `SELECT TOP ${QUERY_LIMIT} * \n FROM ${input.tableId}`,
      };
    case 'postgres':
      return {
        label,
        query: `SELECT * \n FROM ${input.tableId} \n LIMIT ${QUERY_LIMIT}`,
      };
    case 'sqlite':
      return {
        label,
        query: `SELECT * \n FROM ${input.tableId} \n LIMIT ${QUERY_LIMIT}`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `SELECT * \n FROM ${input.tableId} \n LIMIT ${QUERY_LIMIT}`,
      };
  }
}

function getSelectSpecificColumns(input: TableActionInput): TableActionOutput | undefined {
  const label = `Select Specific Columns`;

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n AND ');

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        query: `SELECT TOP ${QUERY_LIMIT} ${columnString} \n FROM ${input.tableId} WHERE ${whereColumnString}`,
      };
    case 'postgres':
      return {
        label,
        query: `SELECT ${columnString} \n FROM ${input.tableId} WHERE ${whereColumnString} \n LIMIT ${QUERY_LIMIT}`,
      };
    case 'sqlite':
      return {
        label,
        query: `SELECT ${columnString} \n FROM ${input.tableId} WHERE ${whereColumnString} \n LIMIT ${QUERY_LIMIT}`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `SELECT ${columnString} \n FROM ${input.tableId} WHERE ${whereColumnString} \n LIMIT ${QUERY_LIMIT}`,
      };
  }
}

function getInsertCommand(input: TableActionInput): TableActionOutput | undefined {
  const label = `Insert`;

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => `'?'`).join(',\n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `INSERT INTO ${input.tableId} (\n${columnString}\n) VALUES (\n${insertValueString}\n)`,
      };
  }
}

function getUpdateCommand(input: TableActionInput): TableActionOutput | undefined {
  const label = `Update`;

  const columnString = input.columns.map((col) => `${col.name} = ''`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n AND ');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `UPDATE ${input.tableId}\n SET \n${columnString}\n WHERE ${whereColumnString}`,
      };
  }
}
