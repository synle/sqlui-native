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

export function getInsert(input: SqlAction.TableInput): SqlAction.Output | undefined {
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

export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
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

export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
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

export function getCreateKeyspace(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Keyspace`;

  if (input.dialect === 'cassandra') {
    return {
      label,
      formatter,
      query: `CREATE KEYSPACE IF NOT EXISTS some_keyspace
             WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};`,
    };
  }
}

export function getDropKeyspace(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Keyspace`;

  if (input.dialect === 'cassandra') {
    return {
      label,
      formatter,
      query: `DROP KEYSPACE IF EXISTS ${input.databaseId};`,
    };
  }
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
  getSelectSpecificColumns,
  getInsert,
  getDivider,
  getUpdate,
  getDelete,
];

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [
  getDivider,
  getCreateKeyspace, // TODO: right now this command does not tie to the input, it will hard code the keyspace to be some_keyspace
  getDropKeyspace,
];
