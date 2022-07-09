import get from 'lodash.get';
import set from 'lodash.set';
import { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction, SqluiCore } from 'typings';

export const MONGO_ADAPTER_PREFIX = 'db';

const formatter = 'js';

export function getSampleConnectionString(dialect?: SqluiCore.Dialect) {
  return `mongodb://localhost:27017`;
}

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find().limit(${input.querySize}).toArray();`,
  };
}

export function getSelectOne(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select One Record`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').findOne({_id: ObjectId('some_id')});`,
  };
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
export function getSelectDistinctValues(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Distinct`;
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

export function getInsert(
  input: SqlAction.TableInput,
  value?: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => `'_${col.name}_'`).join(',\n');

  let columns: any = {};

  if (value) {
    columns = value;
  } else {
    for (const column of input.columns) {
      if (column.name !== '_id') {
        const valueToUse: any = column.type === 'string' ? 'abc' : 123;
        set(columns, column.propertyPath || column.name, valueToUse);
      }
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

export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  conditions: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Update`;

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').update(
        ${JSON.stringify(conditions)},
        {$set: ${JSON.stringify(value, null, 2)}}
      );`,
  };
}

export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columns: any = {};
  for (const column of input.columns) {
    if (column.name !== '_id') {
      const valueToUse: any = column.type === 'string' ? 'abc' : 123;
      set(columns, column.propertyPath || column.name, valueToUse);
    }
  }

  const filters = `{_id: ObjectId('some_id')}`

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').update(
        ${filters},
        {$set: ${JSON.stringify(columns, null, 2)}}
      );`,
  };
}

export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

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

export function getCreateCollection(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Collection`;

  if (!input.columns) {
    return undefined;
  }

  let columnString: string = '';

  // TODO: figure out how to use the defaultval

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.createCollection("${input.tableId}")`,
  };
}

export function getDropCollection(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Collection`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').drop()`,
  };
}

export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.createDatabase('${input.databaseId}')`,
  };
}

export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.dropDatabase()`,
  };
}

export function getCreateConnectionDatabase(
  input: SqlAction.ConnectionInput,
): SqlAction.Output | undefined {
  const label = `Create Database`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.createDatabase('some_database_name')`,
  };
}

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
  getSelectAllColumns,
  getSelectSpecificColumns,
  getSelectDistinctValues,
  getSelectOne,
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
export const connectionActionScripts: SqlAction.ConnectionActionScriptGenerator[] = [
  getDivider,
  getCreateConnectionDatabase,
];
