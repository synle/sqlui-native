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

  const actions: TableActionOutput[] = [];
  const tableActionInput = { dialect, connectionId, databaseId, tableId, columns: columns || [] };

  let action;

  action = getSelectAllColumns(tableActionInput);
  action && actions.push(action);

  action = getSelectSpecificColumns(tableActionInput);
  action && actions.push(action);

  action = getInsertCommand(tableActionInput);
  action && actions.push(action);

  action = getUpdateCommand(tableActionInput);
  action && actions.push(action);

  actions.push({
    label: 'divider',
  });

  action = getCreateTable(tableActionInput);
  action && actions.push(action);

  action = getDropTable(tableActionInput);
  action && actions.push(action);

  actions.push({
    label: 'divider',
  });

  action = getAddColumn(tableActionInput);
  action && actions.push(action);

  action = getDropColumn(tableActionInput);
  action && actions.push(action);

  const onShowQuery = (queryToShow: string) => {
    onChangeActiveQuery('lastExecuted', undefined); // this is to stop the query from automatically triggered
    onChangeActiveQuery('connectionId', connectionId);
    onChangeActiveQuery('databaseId', databaseId);
    onChangeActiveQuery('sql', queryToShow);
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

// TODO: move me to a file
interface TableActionInput {
  dialect?: string;
  connectionId?: string;
  databaseId?: string;
  tableId?: string;
  columns: SqluiCore.ColumnMetaData[];
}

type TableActionOutput = {
  label: string;
  query?: string;
};

const QUERY_LIMIT = 10;

function getSelectAllColumns(input: TableActionInput): TableActionOutput | undefined {
  const label = `Select All Columns`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        query: `SELECT TOP ${QUERY_LIMIT} * \nFROM ${input.tableId}`,
      };
    case 'postgres':
      return {
        label,
        query: `SELECT * \nFROM ${input.tableId} \nLIMIT ${QUERY_LIMIT}`,
      };
    case 'sqlite':
      return {
        label,
        query: `SELECT * \nFROM ${input.tableId} \nLIMIT ${QUERY_LIMIT}`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `SELECT * \nFROM ${input.tableId} \nLIMIT ${QUERY_LIMIT}`,
      };
  }
}

function getSelectSpecificColumns(input: TableActionInput): TableActionOutput | undefined {
  const label = `Select Specific Columns`;

  const columnString = `\n` + input.columns.map((col) => `  ${col.name}`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n -- AND ');

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        query: `SELECT TOP ${QUERY_LIMIT} ${columnString} \nFROM ${input.tableId} -- WHERE ${whereColumnString}`,
      };
    case 'postgres':
      return {
        label,
        query: `SELECT ${columnString} \nFROM ${input.tableId} \n -- WHERE ${whereColumnString} \nLIMIT ${QUERY_LIMIT}`,
      };
    case 'sqlite':
      return {
        label,
        query: `SELECT ${columnString} \nFROM ${input.tableId} \n -- WHERE ${whereColumnString} \nLIMIT ${QUERY_LIMIT}`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `SELECT ${columnString} \nFROM ${input.tableId} \n -- WHERE ${whereColumnString} \nLIMIT ${QUERY_LIMIT}`,
      };
  }
}

function getInsertCommand(input: TableActionInput): TableActionOutput | undefined {
  const label = `Insert`;

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => `'_${col.name}_'`).join(',\n');

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

  const columnString = input.columns.map((col) => `-- ${col.name} = ''`).join(',\n');
  const whereColumnString = input.columns.map((col) => `-- ${col.name} = ''`).join(' AND \n');

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

function getCreateTable(input: TableActionInput): TableActionOutput | undefined {
  const label = `Create Table`;
  let columnString: string = '';

  // TODO: figure out how to use the defaultval
  switch (input.dialect) {
    case 'mssql':
      columnString = input.columns
        .map((col) =>
          [
            col.name,
            col.type,
            col.primaryKey ? 'PRIMARY KEY' : '',
            col.autoIncrement ? 'IDENTITY' : '',
            col.allowNull ? '' : 'NOT NULL',
          ].join(' '),
        )
        .join(',\n');
      return {
        label,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case 'postgres':
      columnString = input.columns
        .map((col) => {
          const res = [col.name];

          // TODO: better use regex here
          // nextval(employees_employeeid_seq::regclass)
          if (
            col.primaryKey &&
            col?.defaultValue?.includes('nextval(') &&
            col?.defaultValue?.includes('_seq::regclass)')
          ) {
            res.push('BIGSERIAL PRIMARY KEY');
          } else {
            res.push(col.type);
            res.push(col.allowNull ? '' : 'NOT NULL');
          }

          return res.join(' ');
        })
        .join(',\n');
      return {
        label,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case 'sqlite':
      columnString = input.columns
        .map((col) =>
          [
            col.name,
            col.type,
            col.primaryKey ? 'PRIMARY KEY' : '',
            col.autoIncrement ? 'AUTOINCREMENT' : '',
            col.allowNull ? '' : 'NOT NULL',
          ].join(' '),
        )
        .join(',\n');
      return {
        label,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case 'mariadb':
    case 'mysql':
      columnString = input.columns
        .map((col) =>
          [
            col.name,
            col.type,
            col.primaryKey ? 'PRIMARY KEY' : '',
            col.autoIncrement ? 'AUTO_INCREMENT' : '',
            col.allowNull ? '' : 'NOT NULL',
          ].join(' '),
        )
        .join(',\n');
      return {
        label,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
  }
}

function getDropTable(input: TableActionInput): TableActionOutput | undefined {
  const label = `Drop Table`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `DROP TABLE ${input.tableId}`,
      };
  }
}

function getAddColumn(input: TableActionInput): TableActionOutput | undefined {
  const label = `Add Column`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} NVARCHAR(200)`,
      };
    case 'postgres':
      return {
        label,
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} CHAR(200)`,
      };
    case 'sqlite':
      return {
        label,
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} TEXT`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} varchar(200)`,
      };
  }
}

function getDropColumn(input: TableActionInput): TableActionOutput | undefined {
  const label = `Drop Column`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        query: input.columns
          .map((col) => `--ALTER TABLE ${input.tableId} DROP COLUMN ${col.name}`)
          .join('\n'),
      };
  }
}
