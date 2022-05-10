import { getDivider } from 'src/frontend/scripts/base';
import { SqlAction } from 'typings';

export const MONGO_ADAPTER_PREFIX = 'db';

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
export function getSelectDistinctValues(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Distinct`;

  if (input.dialect === 'mongodb') {
    const columns = input.columns || [];
    const whereColumnString = columns.reduce((res: any, col) => {
      res[col.name] = '';
      return res;
    }, {});

    const distinctColumn = columns.filter((col) => col.name !== '_id')?.[0]?.name || 'some_field';

    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').distinct(
          '${distinctColumn}',
          ${JSON.stringify(whereColumnString)}
        )`,
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

export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

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
          {$set: ${JSON.stringify(columns, null, 2)}}
        );`,
    };
  }
}

export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

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

export function getCreateCollection(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Collection`;

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

export function getDropCollection(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Collection`;

  if (input.dialect === 'mongodb') {
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').drop()`,
    };
  }
}

export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  if (input.dialect === 'mongodb') {
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.create('${input.databaseId}')`,
    };
  }
}

export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;

  if (input.dialect === 'mongodb') {
    return {
      label,
      formatter,
      query: `${MONGO_ADAPTER_PREFIX}.dropDatabase()`,
    };
  }
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
  getSelectSpecificColumns,
  getSelectDistinctValues,
  getDivider,
  getInsert,
  getUpdate,
  getDelete,
  getDivider,
  getCreateCollection,
  getDropCollection,
];

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [
  getDivider,
  getCreateDatabase,
  getDropDatabase,
];
