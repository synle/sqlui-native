import React from 'react';
import Typography from '@mui/material/Typography';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Alert from '@mui/material/Alert';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetMetaData, useGetColumns, useShowHide, useGetConnection } from 'src/hooks';
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
  const dialect = connection?.dialect;

  if (isLoading || !dialect || !connection || !columns || Object.keys(columns).length === 0) {
    return null;
  }

  const actions : TableActionOutput[] = [];
  const tableActionInput = {dialect, connectionId, databaseId, tableId, columns}

  let action;

  action = getSelectAllColumns(tableActionInput);
  action && actions.push(action);

  action = getSelectSpecificColumns(tableActionInput);
  action && actions.push(action);


  const onShowQuery = (queryToShow: string) => {
    prompt('Copy Query: ', queryToShow)
  }

  return (
    <div className='TableActions'>
      {
        actions.map(action => <div><button onClick={() => onShowQuery(action.query)}>{action.label}</button></div>)
      }
    </div>
  );
}

interface TableActionInput {
  dialect: string;
   connectionId: string;
   databaseId: string;
   tableId: string;
   columns: Sqlui.ColumnMetaData[];
}

type TableActionOutput ={
  label: string;
  query: string;
}

const QUERY_LIMIT = 10;

function getSelectAllColumns(input : TableActionInput): TableActionOutput | undefined{
  const label= `Select *`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        query: `SELECT TOP ${QUERY_LIMIT} * FROM ${input.tableId}`
      }
    case 'postgres':
      return {
        label,
        query: `SELECT * FROM ${input.tableId} LIMIT ${QUERY_LIMIT}`
      }
    case 'sqlite':
      return {
        label,
        query: `SELECT * FROM ${input.tableId} LIMIT ${QUERY_LIMIT}`
      }
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `SELECT * FROM ${input.tableId} LIMIT ${QUERY_LIMIT}`
      }
  }
}


function getSelectSpecificColumns(input : TableActionInput): TableActionOutput | undefined{
  const label= `Select *`;

  const columnString = input.columns.map(col => col.name).join(',\n');
  const whereColumnString = input.columns.map(col => `${col.name} = ''`).join('\n AND ');

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        query: `SELECT TOP ${QUERY_LIMIT} ${columnString} FROM ${input.tableId} WHERE ${whereColumnString}`
      }
    case 'postgres':
      return {
        label,
        query: `SELECT ${columnString} FROM ${input.tableId} LIMIT ${QUERY_LIMIT} WHERE ${whereColumnString}`
      }
    case 'sqlite':
      return {
        label,
        query: `SELECT ${columnString} FROM ${input.tableId} LIMIT ${QUERY_LIMIT} WHERE ${whereColumnString}`
      }
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `SELECT ${columnString} FROM ${input.tableId} LIMIT ${QUERY_LIMIT} WHERE ${whereColumnString}`
      }
  }
}
