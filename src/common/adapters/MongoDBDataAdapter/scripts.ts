import get from 'lodash.get';
import set from 'lodash.set';
import BaseDataScript, { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction } from 'typings';

export const MONGO_ADAPTER_PREFIX = 'db';

const formatter = 'js';

export function serializeJsonForMongoScript(object: any) {
  let res = JSON.stringify(
    object,
    (k, v) => {
      if (k === '_id') {
        return `ObjectId('${v}')`;
      }
      return v;
    },
    2,
  );

  // here we construct ObjectId
  res = res.replace(/"ObjectId\('[a-z0-9_]*'\)"/, (a) => {
    const id = a.replace(`ObjectId`, '').replace(/[\(\)'"]/g, '');
    return `ObjectId("${id}")`;
  });

  return res;
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

  const filters = { _id: 'some_id' };

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${
      input.tableId
    }').findOne(${serializeJsonForMongoScript(filters)});`,
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
    // construct nested object properly
    columns[column.propertyPath ? column.propertyPath.join('.') : column.name] =
      column.type === 'string' ? '_some_value_' : 123;
  }
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find(
          ${serializeJsonForMongoScript(columns)}
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

  // select something that is not _id or id
  const distinctColumn =
    columns.filter((col) => col.name !== '_id' && col.name !== 'id')?.[0]?.name || 'some_field';

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').distinct(
          '${distinctColumn}',
          ${serializeJsonForMongoScript(whereColumnString)}
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
        ${serializeJsonForMongoScript(columns)}
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
        ${serializeJsonForMongoScript(conditions)},
        {$set: ${serializeJsonForMongoScript(value)}}
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

  const filters = {
    ...columns,
    ...{ _id: 'some_id' },
  };

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').update(
        ${serializeJsonForMongoScript(filters)},
        {$set: ${serializeJsonForMongoScript(columns)}}
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
    // construct nested object properly
    columns[column.propertyPath ? column.propertyPath.join('.') : column.name] =
      column.type === 'string' ? '_some_value_' : 123;
  }
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').deleteMany(
        ${serializeJsonForMongoScript(columns)}
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

export class ConcreteDataScripts extends BaseDataScript {
  dialects = ['mongodb'];
  getIsTableIdRequiredForQuery() {
    return false;
  }

  getSyntaxMode() {
    return 'javascript';
  }

  getTableScripts() {
    return [
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
  }

  getDatabaseScripts() {
    return [getDivider, getCreateDatabase, getDropDatabase];
  }

  getConnectionScripts() {
    return [getDivider, getCreateConnectionDatabase];
  }

  getSampleConnectionString(dialect) {
    return `mongodb://localhost:27017`;
  }
}

export default new ConcreteDataScripts();
