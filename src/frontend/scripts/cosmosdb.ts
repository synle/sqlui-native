import { getDivider } from 'src/frontend/scripts/base';
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

export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  if (!input.columns) {
    return undefined;
  }

  if (input.dialect === 'cosmosdb') {
    return {
      label,
      formatter,
      // TODO: fix me
      query: `${COSMOSDB_ADAPTER_PREFIX}.createCollection("${input.tableId}")`,
    };
  }
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
  getDivider
];

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [
  getCreateTable,
];
