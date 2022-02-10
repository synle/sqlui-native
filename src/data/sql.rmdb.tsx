import { SqluiCore,SqlAction } from 'typings';
import {getDivider} from 'src/data/sql'

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter: 'sql',
        query: `SELECT TOP ${input.querySize} * \nFROM ${input.tableId}`,
      };
    case 'postgres':
      return {
        label,
        formatter: 'sql',
        query: `SELECT * \nFROM ${input.tableId} \nLIMIT ${input.querySize}`,
      };
    case 'sqlite':
      return {
        label,
        formatter: 'sql',
        query: `SELECT * \nFROM ${input.tableId} \nLIMIT ${input.querySize}`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: `SELECT * \nFROM ${input.tableId} \nLIMIT ${input.querySize}`,
      };

  }
}

export function getSelectCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Count`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `-- ${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: `SELECT COUNT(*) \nFROM ${input.tableId} \n -- WHERE \n ${whereColumnString}`,
      };
  }
}

export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = `\n` + input.columns.map((col) => `  ${col.name}`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n -- AND ');

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter: 'sql',
        query: `SELECT TOP ${input.querySize} ${columnString} \nFROM ${input.tableId} -- WHERE ${whereColumnString}`,
      };
    case 'postgres':
      return {
        label,
        formatter: 'sql',
        query: `SELECT ${columnString} \nFROM ${input.tableId} \n -- WHERE ${whereColumnString} \nLIMIT ${input.querySize}`,
      };
    case 'sqlite':
      return {
        label,
        formatter: 'sql',
        query: `SELECT ${columnString} \nFROM ${input.tableId} \n -- WHERE ${whereColumnString} \nLIMIT ${input.querySize}`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: `SELECT ${columnString} \nFROM ${input.tableId} \n -- WHERE ${whereColumnString} \nLIMIT ${input.querySize}`,
      };

  }
}

export function getInsertCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => `'_${col.name}_'`).join(',\n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
  }
}

export function getUpdateCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

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
        formatter: 'js',
        query: `UPDATE ${input.tableId}\n SET \n${columnString}\n WHERE ${whereColumnString}`,
      };
  }
}

export function getDeleteCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `-- ${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
          return {
        label,
        formatter: 'sql',
        query: `-- DELETE FROM ${input.tableId} \n -- WHERE\n ${whereColumnString}`,
      };
  }
}

export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  if (!input.columns) {
    return undefined;
  }

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
        formatter: 'sql',
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
        formatter: 'sql',
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
        formatter: 'sql',
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
        formatter: 'sql',
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
  }
}

export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: `-- DROP TABLE ${input.tableId}`,
      };
  }
}

export function getDropTables(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: input.tables
          .map((table) => getDropTable({ ...input, tableId: table.name }))
          .join('\n'),
      };
  }
}

export function getAddColumn(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Add Column`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter: 'sql',
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} NVARCHAR(200)`,
      };
    case 'postgres':
      return {
        label,
        formatter: 'sql',
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} CHAR(200)`,
      };
    case 'sqlite':
      return {
        label,
        formatter: 'sql',
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} TEXT`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: `ALTER TABLE ${input.tableId} ADD COLUMN colname${Date.now()} varchar(200)`,
      };
  }
}

export function getDropColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Column`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: input.columns
          .map((col) => `--ALTER TABLE ${input.tableId} DROP COLUMN ${col.name}`)
          .join('\n'),
      };
  }
}


export const scripts = [
getSelectAllColumns,
getSelectCount,
getSelectSpecificColumns,
getInsertCommand,
getUpdateCommand,
getDeleteCommand,
getDivider,
getCreateTable,
getDropTable,
getAddColumn,
getDropColumns,
  ]
