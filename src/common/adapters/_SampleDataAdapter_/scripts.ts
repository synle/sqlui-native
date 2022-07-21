import BaseDataScript, { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction } from 'typings';

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

export class ConcreteDataScripts extends BaseDataScript {
  dialects = ['<your_dialect_name>'];

  // TODO: implement me
  getTableScripts() {
    return [
      // getDivider, getSelectAllColumns
    ];
  }

  // TODO: implement me
  getDatabaseScripts() {
    return [
      //getDivider, getCreateDatabase
    ];
  }

  // TODO: implement me
  supportMigration() {
    return false;
  }

  // TODO: implement me
  supportCreateRecordForm() {
    return false;
  }

  // TODO: implement me
  supportEditRecordForm() {
    return false;
  }

  // TODO: implement me
  getConnectionScripts() {
    return [];
  }

  // TODO: implement me
  getSampleConnectionString(dialect) {
    return `your_dialect://your_props`;
  }

  // TODO: implement me
  getSampleSelectQuery(actionInput: SqlAction.TableInput) : SqlAction.Output | undefined{
    return undefined;
  }
}

export default new ConcreteDataScripts();
