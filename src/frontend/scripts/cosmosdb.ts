import { SqlAction } from 'typings';

export const COSMOSDB_ADAPTER_PREFIX = 'db';

const formatter = 'js';

// for redis
export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  return {
    label,
    formatter,
    query: `SELECT * FROM c`,
  };
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
];

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [];
