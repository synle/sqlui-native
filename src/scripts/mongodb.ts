import { SqlAction } from 'typings';
import { getDivider } from './base';

const MONGO_ADAPTER_PREFIX = 'db';

const formatter = 'js';

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  if (input.dialect === 'mongodb') {
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find().limit(${input.querySize}).toArray();`,
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
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n -- AND ');

  if (input.dialect === 'mongodb') {
    const columns: any = {};
    for (const column of input.columns || []) {
      if (!column.name.includes('.')) {
        columns[column.name] = column.type === 'string' ? '' : 123;
      }
    }
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find(
          ${JSON.stringify(columns)}
        ).limit(${input.querySize}).toArray();`,
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

  if (input.dialect === 'mongodb') {
    const columns: any = {};
    for (const column of input.columns) {
      if (column.name !== '_id' && !column.name.includes('.')) {
        columns[column.name] = column.type === 'string' ? '' : 123;
      }
    }
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').insertMany([
          ${JSON.stringify(columns)}
        ]);`,
    };
  }
}

export function getUpdateCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => `-- ${col.name} = ''`).join(',\n');
  const whereColumnString = input.columns.map((col) => `-- ${col.name} = ''`).join(' AND \n');

  if (input.dialect === 'mongodb') {
    const columns: any = {};
    for (const column of input.columns) {
      if (column.name !== '_id' && !column.name.includes('.')) {
        columns[column.name] = column.type === 'string' ? '' : 123;
      }
    }
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').update(
          ${JSON.stringify(columns)},
          {\$set: ${JSON.stringify(columns, null, 2)}}
        );`,
    };
  }
}

export function getDeleteCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `-- ${col.name} = ''`).join(' AND \n');

  if (input.dialect === 'mongodb') {
    const columns: any = {};
    for (const column of input.columns) {
      if (column.name !== '_id' && !column.name.includes('.')) {
        columns[column.name] = column.type === 'string' ? '' : 123;
      }
    }
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').deleteMany(
          ${JSON.stringify(columns)}
        );`,
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
  if (input.dialect === 'mongodb') {
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.createCollection("${input.tableId}")`,
    };
  }
}

export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  if (input.dialect === 'mongodb') {
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').drop()`,
    };
  }
}

export const scripts: SqlAction.ScriptGenerator[] = [
  getSelectAllColumns,
  getSelectSpecificColumns,
  getInsertCommand,
  getUpdateCommand,
  getDeleteCommand,
  getDivider,
  getCreateTable,
  getDropTable,
];
