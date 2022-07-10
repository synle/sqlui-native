import BaseDataScript, { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction, SqluiCore } from 'typings';

const formatter = 'js';

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  return {
    label,
    formatter,
    query: `// TODO: implement me`,
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

export class AzureCosmosDataAdapterScripts extends BaseDataScript{
  // TODO: implement me
  getTableScripts() {
    return [
          getDivider,
    getSelectAllColumns,
    ]
  }

  // TODO: implement me
  getDatabaseScripts() {
    return [
    getDivider,
    getCreateDatabase,
    ]
  }

  // TODO: implement me
  getConnectionScripts() {
    return [
    ]
  }

  // TODO: implement me
  getSampleConnectionString(dialect?: SqluiCore.Dialect) {
    return `your_dialect://your_props`
  }
}
