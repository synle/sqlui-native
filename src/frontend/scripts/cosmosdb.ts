import { getDivider } from 'src/frontend/scripts/base';
import { SqlAction } from 'typings';

export const COSMOSDB_ADAPTER_PREFIX = 'db';

const formatter = 'js';

// https://docs.microsoft.com/en-us/azure/cosmos-db/sql/sql-api-nodejs-get-started?tabs=windows

// for cosmosdb
export function getRawSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Raw Select All Columns SQL`;

  return {
    label,
    formatter: 'sql',
    query: `SELECT * FROM c`,
  };
}

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .items
        .query({
          query: 'SELECT * from c OFFSET 1 LIMIT 5',
        })
        .fetchAll()
    `,
  };
}

export function getInsert(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Insert`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .items
        .create({
          id: '123',
          name: 'test'
        })
    `,
  };
}

export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .item('id_123', 'category')
        .replace({
          id: 'id_123',
          name: 'new_name'
        })
    `,
  };
}

export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Insert`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .item('id_123', 'category')
        .delete()
    `,
  };
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
  getInsert,
  getUpdate,
  getDelete,
  getDivider,
  getRawSelectAllColumns,
];

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [];
