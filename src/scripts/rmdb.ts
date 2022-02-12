import { SqlAction } from 'typings';
import { getDivider } from './base';

const formatter = 'sql';

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `SELECT TOP ${input.querySize} *
                FROM ${input.tableId}`,
      };
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT *
                FROM ${input.tableId}
                LIMIT ${input.querySize}`,
      };
  }
}

export function getSelectCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Count`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT COUNT(*)
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
  }
}

export function getSelectSpecificColumns(
  input: SqlAction.TableInput,
): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = `\n` + input.columns.map((col) => `  ${col.name}`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n AND ');

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `SELECT TOP ${input.querySize} ${columnString}
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT ${columnString}
                FROM ${input.tableId}
                WHERE ${whereColumnString}
                LIMIT ${input.querySize}`,
      };
  }
}

export function getSelectDistinctValues(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Distinct`;

  if (!input.columns) {
    return undefined;
  }

  const columns = input.columns || [];

  const distinctColumn = columns.filter((col) => !col.primaryKey)?.[0]?.name || 'some_field';
  const whereColumnString = columns.map((col) => `${col.name} = ''`).join('\n AND ');

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `SELECT DISTINCT TOP ${input.querySize} ${distinctColumn}
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT DISTINCT ${distinctColumn}
                FROM ${input.tableId}
                WHERE ${whereColumnString}
                LIMIT ${input.querySize}`,
      };
  }
}

export function getInsertCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columns = input.columns.filter((col) => !col.primaryKey);
  const columnString = columns.map((col) => col.name).join(',\n');
  const insertValueString = columns.map((col) => `'_${col.name}_'`).join(',\n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'sql',
        query: `INSERT INTO ${input.tableId} (${columnString})
                VALUES (${insertValueString})`,
      };
  }
}

export function getUpdateCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => `${col.name} = ''`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter: 'js',
        query: `UPDATE ${input.tableId}
                SET ${columnString}
                WHERE ${whereColumnString}`,
      };
  }
}

export function getDeleteCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `DELETE FROM ${input.tableId}
                WHERE ${whereColumnString}`,
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
        formatter,
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
        formatter,
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
        formatter,
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
        formatter,
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
        formatter,
        query: `DROP TABLE ${input.tableId}`,
      };
  }
}

export function getAddColumn(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Add Column`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 NVARCHAR(200)`,
      };
    case 'postgres':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 CHAR(200)`,
      };
    case 'sqlite':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 TEXT`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 varchar(200)`,
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
        formatter,
        query: input.columns
          .map(
            (col) => `ALTER TABLE ${input.tableId}
                         DROP COLUMN ${col.name};`,
          )
          .join('\n'),
      };
  }
}

export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `DROP DATABASE ${input.dialect}`,
      };
  }
}

export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `CREATE DATABASE ${input.dialect}`,
      };
  }
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
  getSelectCount,
  getSelectSpecificColumns,
  getSelectDistinctValues,
  getDivider,
  getInsertCommand,
  getUpdateCommand,
  getDeleteCommand,
  getDivider,
  getCreateTable,
  getDropTable,
  getAddColumn,
  getDropColumns,
];

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [
  getDivider,
  getDropDatabase,
  getCreateDatabase,
];
