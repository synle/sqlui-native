import { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction, SqluiCore } from 'typings';

const formatter = 'js';

export function getSampleConnectionString(dialect?: SqluiCore.Dialect) {
  return `aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net`;
}

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  return {
    label,
    formatter,
    query: `client.listEntities()`,
  };
}

export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  return {
    label,
    formatter,
    query: `
      // TODO: implement me
    `,
  };
}

export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;

  return {
    label,
    formatter,
    query: `
      // TODO: implement me
    `,
  };
}

// TODO: implement me
export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getDivider,
  getSelectAllColumns,
];

// TODO: implement me
export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [
  getDivider,
  getCreateDatabase,
];
