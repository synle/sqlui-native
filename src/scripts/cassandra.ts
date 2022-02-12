import { SqlAction } from 'typings';
import { getDivider } from './base';

const formatter = 'sql';

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  if (input.dialect === 'cassandra') {
    return {
      label,
      formatter,
      query: `SELECT *
              FROM ${input.tableId}
              LIMIT ${input.querySize}`,
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

  if (input.dialect === 'cassandra') {
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

export function getInsertCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => `'_${col.name}_'`).join(',\n');

  if (input.dialect === 'cassandra') {
    return {
      label,
      formatter,
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

  if (input.dialect === 'cassandra') {
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

  if (input.dialect === 'cassandra') {
    return {
      label,
      formatter,
      query: `DELETE FROM ${input.tableId}
              WHERE ${whereColumnString}`,
    };
  }
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
  getSelectSpecificColumns,
  getInsertCommand,
  getDivider,
  getUpdateCommand,
  getDeleteCommand,
];

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [];
